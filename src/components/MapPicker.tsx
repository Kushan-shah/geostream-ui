// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapPickerProps {
  currentBbox: string;
  onSelect: (bbox: string) => void;
  onClose: () => void;
}

/** Clamp longitude to [-180, 180] and latitude to [-90, 90] */
function clampCoord(lng: number, lat: number): [number, number] {
  // Wrap longitude to [-180, 180]
  const cLng = ((lng + 180) % 360 + 360) % 360 - 180;
  const cLat = Math.max(-90, Math.min(90, lat));
  return [cLng, cLat];
}

export default function MapPicker({ currentBbox, onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const [selectedBbox, setSelectedBbox] = useState<string>(currentBbox);

  const parseBbox = useCallback((bbox: string): [number, number, number, number] | null => {
    const parts = bbox.split(",").map(s => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      return parts as [number, number, number, number];
    }
    return null;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 78],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]],
    }).addTo(map);

    mapRef.current = map;

    // Show existing bbox
    const parsed = parseBbox(currentBbox);
    if (parsed) {
      const [lon1, lat1, lon2, lat2] = parsed;
      const [cLon1, cLat1] = clampCoord(lon1, lat1);
      const [cLon2, cLat2] = clampCoord(lon2, lat2);
      const bounds = L.latLngBounds([cLat1, cLon1], [cLat2, cLon2]);
      const rect = L.rectangle(bounds, {
        color: "#a855f7",
        weight: 2,
        fillColor: "#a855f7",
        fillOpacity: 0.15,
        dashArray: "6",
      }).addTo(map);
      rectRef.current = rect;
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Drawing state
    let isMouseDown = false;
    let drawStart: L.LatLng | null = null;
    let tempRect: L.Rectangle | null = null;

    map.on("mousedown", (e: L.LeafletMouseEvent) => {
      // Only draw when in draw mode (not panning)
      isMouseDown = true;
      drawStart = e.latlng;
      map.dragging.disable();

      if (rectRef.current) {
        map.removeLayer(rectRef.current);
        rectRef.current = null;
      }
    });

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (!isMouseDown || !drawStart) return;

      const bounds = L.latLngBounds(drawStart, e.latlng);

      if (tempRect) {
        tempRect.setBounds(bounds);
      } else {
        tempRect = L.rectangle(bounds, {
          color: "#a855f7",
          weight: 2,
          fillColor: "#a855f7",
          fillOpacity: 0.15,
          dashArray: "6",
        }).addTo(map);
      }
    });

    map.on("mouseup", (e: L.LeafletMouseEvent) => {
      if (!isMouseDown || !drawStart) {
        map.dragging.enable();
        return;
      }

      isMouseDown = false;
      map.dragging.enable();

      if (tempRect) {
        const bounds = L.latLngBounds(drawStart, e.latlng);
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        if (Math.abs(sw.lat - ne.lat) > 0.01 && Math.abs(sw.lng - ne.lng) > 0.01) {
          rectRef.current = tempRect;
          // CLAMP coordinates to valid range
          const [swLng, swLat] = clampCoord(sw.lng, sw.lat);
          const [neLng, neLat] = clampCoord(ne.lng, ne.lat);
          const bboxStr = `${swLng.toFixed(1)}, ${swLat.toFixed(1)}, ${neLng.toFixed(1)}, ${neLat.toFixed(1)}`;
          setSelectedBbox(bboxStr);
        } else {
          map.removeLayer(tempRect);
        }
        tempRect = null;
      }

      drawStart = null;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    onSelect(selectedBbox);
    onClose();
  };

  const handleReset = () => {
    if (rectRef.current && mapRef.current) {
      mapRef.current.removeLayer(rectRef.current);
      rectRef.current = null;
    }
    setSelectedBbox("");
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[90vw] h-[85vh] max-w-6xl bg-zinc-900 rounded-2xl border border-zinc-700/50 overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-800/80 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <span className="text-lg">🌍</span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Select Region on Map</h3>
              <p className="text-[10px] text-zinc-400">Click and drag to draw a bounding box. Use scroll wheel to zoom.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedBbox && (
              <div className="text-xs text-purple-300 bg-purple-500/15 px-3 py-1.5 rounded-lg border border-purple-500/20 font-mono">
                BBOX: {selectedBbox}
              </div>
            )}
            <button onClick={handleReset} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-all" title="Clear selection">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleConfirm} disabled={!selectedBbox} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white">
              <Check className="w-3.5 h-3.5" /> Use This BBOX
            </button>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Map */}
        <div ref={containerRef} className="flex-1 cursor-crosshair" style={{ minHeight: 0, background: "#1a1a2e" }} />

        {/* Footer */}
        <div className="px-5 py-2 bg-zinc-800/60 border-t border-zinc-700/30 flex items-center justify-between">
          <div className="flex gap-4 text-[10px] text-zinc-500">
            <span>🖱️ <strong>Click + Drag</strong> = Draw BBOX</span>
            <span>🔄 <strong>Scroll</strong> = Zoom</span>
          </div>
          <div className="text-[10px] text-zinc-600">
            Tiles: CartoDB Dark Matter | Data: OpenStreetMap
          </div>
        </div>
      </div>
    </div>
  );
}
