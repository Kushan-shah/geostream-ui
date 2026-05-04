// Copyright 2026 Kushan Shah
// SPDX-License-Identifier: Apache-2.0

// ── NASA EONET (Earth Observatory Natural Event Tracker) v3 API Client ──
// Fetches LIVE active natural disaster events directly from NASA's servers.
// API Docs: https://eonet.gsfc.nasa.gov/docs/v3
// No API key required. All data is 100% real — zero simulated/synthetic events.

const EONET_API_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const GIBS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

// ── Types (match the NASA EONET v3 JSON schema exactly) ─────────────

export interface EonetGeometry {
  date: string;
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
}

export interface EonetCategory {
  id: string;
  title: string;
}

export interface EonetEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: EonetCategory[];
  geometry: EonetGeometry[];
}

interface EonetApiResponse {
  title: string;
  description: string;
  events: EonetEvent[];
}

// ── Simple in-memory cache (prevents spamming NASA on every tab switch) ──

let cachedEvents: EonetEvent[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// ── Fetch live events from NASA EONET ───────────────────────────────

export async function fetchLiveEvents(limit = 15): Promise<EonetEvent[]> {
  // Return cached data if fresh
  if (cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedEvents;
  }

  try {
    const url = `${EONET_API_URL}?status=open&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      console.warn(`EONET API returned ${res.status}`);
      return cachedEvents; // Return stale cache if available
    }

    const data: EonetApiResponse = await res.json();

    // Filter: only keep events with valid Point geometry (we need lat/lon for BBOX)
    const validEvents = data.events.filter(
      (ev) => ev.geometry.length > 0 && ev.geometry[0].type === "Point"
    );

    cachedEvents = validEvents;
    cacheTimestamp = Date.now();
    return validEvents;
  } catch (err) {
    console.warn("EONET API fetch failed (network issue):", err);
    return cachedEvents; // Graceful fallback to stale cache or empty array
  }
}

// ── Smart BBOX calculation from a single point ──────────────────────
// NASA gives a single GPS coordinate. We create a ~300km viewing window.

export function calculateBbox(lon: number, lat: number, paddingDeg = 1.5): string {
  let minLon = lon - paddingDeg;
  let maxLon = lon + paddingDeg;
  let minLat = lat - paddingDeg;
  let maxLat = lat + paddingDeg;

  // Preserve strict aspect ratio to prevent map/video warping at poles/antimeridian.
  if (maxLon > 180) {
    maxLon = 180;
    minLon = 180 - paddingDeg * 2;
  } else if (minLon < -180) {
    minLon = -180;
    maxLon = -180 + paddingDeg * 2;
  }

  if (maxLat > 90) {
    maxLat = 90;
    minLat = 90 - paddingDeg * 2;
  } else if (minLat < -90) {
    minLat = -90;
    maxLat = -90 + paddingDeg * 2;
  }

  return `${minLon.toFixed(2)}, ${minLat.toFixed(2)}, ${maxLon.toFixed(2)}, ${maxLat.toFixed(2)}`;
}

// ── Smart date range based on event date ────────────────────────────
// Accounts for NASA GIBS processing latency (2-3 days for "best" endpoint)

export function calculateDateRange(eventDateStr: string): { startDate: string; endDate: string } {
  const eventDate = new Date(eventDateStr);

  // GIBS "best" endpoint has ~2 day processing latency
  const gibsLatency = new Date();
  gibsLatency.setDate(gibsLatency.getDate() - 2);

  // End date: the event date or GIBS availability, whichever is earlier
  const endDate = eventDate < gibsLatency ? eventDate : gibsLatency;

  // Start date: 3 days BEFORE the event started
  // This ensures we capture the build-up, not random old imagery
  const startDate = new Date(eventDate);
  startDate.setDate(startDate.getDate() - 3);

  // If startDate is after endDate (event is very recent, GIBS hasn't caught up),
  // shift the window to show what GIBS actually has
  if (startDate > endDate) {
    const adjusted = new Date(endDate);
    adjusted.setDate(adjusted.getDate() - 3);
    return {
      startDate: adjusted.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

// ── Smart layer auto-selection based on event category ──────────────
// Maps real EONET categories to verified WMS layers already in satellites.ts

interface WmsLayer {
  url: string;
  name: string;
  opacity: number;
}

const CATEGORY_LAYER_MAP: Record<string, WmsLayer[]> = {
  wildfires: [
    { url: GIBS_URL, name: "VIIRS_NOAA21_CorrectedReflectance_TrueColor", opacity: 1.0 },
    { url: GIBS_URL, name: "VIIRS_NOAA21_Thermal_Anomalies_375m_All", opacity: 0.8 },
  ],
  volcanoes: [
    { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
    { url: GIBS_URL, name: "TROPOMI_L2_Sulfur_Dioxide_Total_Vertical_Column", opacity: 0.7 },
  ],
  // severeStorms handled dynamically in getLayersForEvent() based on coordinates
  seaLakeIce: [
    { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
  ],
};

// Default fallback for unknown categories
const DEFAULT_LAYERS: WmsLayer[] = [
  { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
];

export function getLayersForEvent(event: EonetEvent): WmsLayer[] {
  const categoryId = event.categories[0]?.id || "";

  // Storms: Use NEXRAD / GOES West for Americas (lon -170 to -30). Use MODIS for elsewhere.
  if (categoryId === "severeStorms") {
    const lon = event.geometry[0]?.coordinates[0] ?? 0;
    if (lon >= -130 && lon <= -60) {
      // US/Americas → use NEXRAD composite (live)
      return [{ url: "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi", name: "nexrad-n0q-900913", opacity: 1.0 }];
    } else if (lon >= -170 && lon <= -30) {
      // Wider Americas → use GOES West IR (live)
      return [{ url: "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/west_ir.cgi", name: "goes_west_ir", opacity: 1.0 }];
    }
    // Outside Americas → fall back to MODIS (polar, 1-2x/day, but global)
    return [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
    ];
  }

  return CATEGORY_LAYER_MAP[categoryId] || DEFAULT_LAYERS;
}

// ── UI helper: category → emoji icon ────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  wildfires: "🔥",
  volcanoes: "🌋",
  severeStorms: "🌀",
  seaLakeIce: "🧊",
  earthquakes: "🫨",
  floods: "🌊",
  landslides: "⛰️",
  drought: "☀️",
  dustHaze: "💨",
  tempExtremes: "🌡️",
  snow: "❄️",
};

export function getEventEmoji(event: EonetEvent): string {
  const categoryId = event.categories[0]?.id || "";
  return CATEGORY_EMOJI[categoryId] || "🌍";
}

// ── UI helper: severity color based on magnitude ────────────────────

export function getSeverityColor(event: EonetEvent): string {
  const mag = event.geometry[0]?.magnitudeValue;
  if (mag === null || mag === undefined) return "zinc"; // unknown
  if (mag >= 5000) return "red";     // massive
  if (mag >= 1000) return "orange";  // large
  if (mag >= 100) return "yellow";   // moderate
  return "emerald";                  // small
}

// ── UI helper: relative time since last NASA report update ───────────
// NOTE: The geometry date is the last time the source (e.g. IRWIN) updated
// the record — NOT when the event started. A fire could have started days
// earlier; this is when the latest size/position report was filed.

export function getEventAge(event: EonetEvent): string {
  const eventDate = new Date(event.geometry[0]?.date || "");
  const now = new Date();
  const diffMs = now.getTime() - eventDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Updated just now";
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  if (diffDays === 1) return "Updated 1d ago";
  return `Updated ${diffDays}d ago`;
}

// ── UI helper: format magnitude for display ─────────────────────────

export function formatMagnitude(event: EonetEvent): string | null {
  const geo = event.geometry[0];
  if (!geo?.magnitudeValue) return null;
  const val = geo.magnitudeValue.toLocaleString();
  const unit = geo.magnitudeUnit || "";
  return `${val} ${unit}`;
}
