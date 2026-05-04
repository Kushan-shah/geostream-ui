// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @next/next/no-img-element */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, CheckCircle2, AlertCircle, LogOut, Clock, XCircle, RefreshCw, Download, Film, Maximize2, Satellite, ChevronDown, MapPin, Globe, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createJob, listJobs, type Job } from "@/lib/api";
import { SATELLITE_CATALOG, CATEGORIES, REGION_PRESETS, EVENT_PRESETS, ORBITAL_SATELLITE_CONFIG, getOrbitalConfig, checkBboxCompatibility, analyzeLayerAlignment, getLayerSourceInfo } from "@/lib/satellites";
import { fetchLiveEvents, calculateBbox, calculateDateRange, getLayersForEvent, getEventEmoji, getSeverityColor, getEventAge, formatMagnitude, type EonetEvent } from "@/lib/eonet";
import * as api from "@/lib/api";
import dynamic from "next/dynamic";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Default: Northern California (fire-prone region with good MODIS coverage)
  const [bboxStr, setBboxStr] = useState("-124.0, 38.0, -120.0, 42.0");
  // Default: last 10 days (ensures NASA GIBS has data)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 12);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  });
  const [fps, setFps] = useState(30);
  const [frameCount, setFrameCount] = useState(150);
  const [timeStep, setTimeStep] = useState("1d");
  const [trackSatellite, setTrackSatellite] = useState("");
  const [wmsLayers, setWmsLayers] = useState<{ url: string; name: string; opacity?: number }[]>([
    { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor" },
    { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_Thermal_Anomalies_All" }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [enlargedVideoUrl, setEnlargedVideoUrl] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [presetFilter, setPresetFilter] = useState<string>("all");
  const [showMap, setShowMap] = useState(false);
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  const [swipePosition, setSwipePosition] = useState(50);
  const [activeTab, setActiveTab] = useState<"render" | "events" | "orbital">("render");
  const [liveEvents, setLiveEvents] = useState<EonetEvent[]>([]);
  const [liveEventsLoading, setLiveEventsLoading] = useState(false);
  const [liveEventsLastUpdated, setLiveEventsLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Fetch live NASA EONET events when Events tab is opened
  useEffect(() => {
    if (activeTab !== 'events') return;
    let cancelled = false;
    const loadEvents = async () => {
      setLiveEventsLoading(true);
      const events = await fetchLiveEvents(15);
      if (!cancelled) {
        setLiveEvents(events);
        setLiveEventsLastUpdated(new Date());
        setLiveEventsLoading(false);
      }
    };
    loadEvents();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeTab]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const data = await listJobs();
      if (mountedRef.current) setJobs(data);
    } catch { /* ignore */ } finally {
      if (mountedRef.current) setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) setTimeout(() => fetchJobs(), 0);
  }, [isAuthenticated, fetchJobs]);

  // Auto-poll job list every 5s when any job is PROCESSING or PENDING
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === "PROCESSING" || j.status === "PENDING");
    if (!hasActiveJobs || !isAuthenticated) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(() => {
      if (mountedRef.current) fetchJobs();
    }, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [jobs, isAuthenticated, fetchJobs]);

  // Auto-reset temporal resolution to Daily if geostationary layers are removed
  useEffect(() => {
    if (timeStep === "1d") return;
    const HIGH_FREQ_KEYWORDS = ['goes', 'himawari', 'nexrad', 'ahi'];
    const hasHighFreq = wmsLayers.some(l =>
      HIGH_FREQ_KEYWORDS.some(kw => l.name.toLowerCase().includes(kw) || l.url.toLowerCase().includes(kw))
    );
    if (!hasHighFreq) {
      setTimeout(() => setTimeStep("1d"), 0);
    }
  }, [wmsLayers, timeStep]);



  // SSE Real-time Progress Tracking for Active Job
  useEffect(() => {
    if (!activeJobId || !isAuthenticated) return;

    const token = localStorage.getItem("geostream_token");
    if (!token) return;

    const sseUrl = `${api.API_BASE}/api/jobs/progress/stream?job_id=${activeJobId}&token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update the specific job in the list in real-time
        setJobs(prevJobs => prevJobs.map(job => 
          job.id === activeJobId 
            ? { ...job, status: data.status, processed_frames: data.processed, video_url: data.video_url || job.video_url }
            : job
        ));

        if (data.status === "COMPLETED" || data.status === "FAILED") {
          eventSource.close();
          setActiveJobId(null);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
      // Fallback to polling if SSE drops
      setTimeout(fetchJobs, 2000);
    };

    return () => {
      eventSource.close();
    };
  }, [activeJobId, isAuthenticated, fetchJobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const bbox = bboxStr.split(",").map(s => parseFloat(s.trim()));
      if (bbox.length !== 4 || bbox.some(isNaN)) throw new Error("Invalid BBOX — must be 4 comma-separated numbers");
      const res = await createJob({ bbox, start_date: startDate, end_date: endDate, fps, frame_count: frameCount, wms_layers: wmsLayers, time_step: timeStep, track_satellite: trackSatellite || undefined });
      setActiveJobId(res.job_id);
      await fetchJobs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); router.push("/login"); };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "text-green-400";
      case "PROCESSING": return "text-blue-400";
      case "PENDING": return "text-yellow-400";
      case "FAILED": return "text-red-400";
      default: return "text-zinc-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="w-4 h-4" />;
      case "PROCESSING": return <Loader2 className="w-4 h-4 animate-spin" />;
      case "PENDING": return <Clock className="w-4 h-4" />;
      case "FAILED": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Resolve video URLs: relative paths like /videos/xxx.mp4 need API_BASE prefix
  // Also handle legacy absolute URLs from older jobs that have hardcoded http://localhost:8080
  const resolveVideoUrl = (url: string) => {
    if (url.startsWith('/')) return `${api.API_BASE}${url}`;
    // Normalize legacy localhost URLs to use current API_BASE
    const localhostPattern = /^https?:\/\/localhost:\d+/;
    if (localhostPattern.test(url)) return url.replace(localhostPattern, api.API_BASE);
    return url;
  };

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen p-6 md:p-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-10 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">GeoStream</h1>
          <p className="text-zinc-500 text-sm mt-1">Logged in as {user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center text-zinc-400 hover:text-zinc-200 transition-colors text-sm gap-2 bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </motion.div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Job Creation */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-5 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center text-zinc-100">
              <Play className="w-5 h-5 mr-2 text-blue-400" /> New Task
            </h2>
            <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
              <button type="button" onClick={() => { setActiveTab('render'); setTrackSatellite(''); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'render' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Manual</button>
              <button type="button" onClick={() => setActiveTab('events')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'events' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Events{liveEvents.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400">{liveEvents.length}</span>}</button>
              <button type="button" onClick={() => setActiveTab('orbital')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'orbital' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Orbital</button>
            </div>
          </div>

          {activeTab === 'events' ? (
            <div className="space-y-4">
              {/* ── 🔴 LIVE ACTIVE EVENTS (from NASA EONET API) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Live Active Events</h3>
                  </div>
                  {liveEventsLastUpdated && (
                    <span className="text-[10px] text-zinc-600">NASA EONET • {liveEventsLastUpdated.toLocaleTimeString()}</span>
                  )}
                </div>

                {liveEventsLoading && liveEvents.length === 0 ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-zinc-800/50 animate-pulse" />
                    ))}
                  </div>
                ) : liveEvents.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-3">No active events reported by NASA right now.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
                    {liveEvents.map((ev) => {
                      const severity = getSeverityColor(ev);
                      const mag = formatMagnitude(ev);
                      const severityBorder = severity === 'red' ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10' : severity === 'orange' ? 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10' : severity === 'yellow' ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10' : 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10';
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            const [lon, lat] = ev.geometry[0].coordinates;
                            const bbox = calculateBbox(lon, lat);
                            const { startDate: sd, endDate: ed } = calculateDateRange(ev.geometry[0].date);
                            const layers = getLayersForEvent(ev);
                            setBboxStr(bbox);
                            setStartDate(sd);
                            setEndDate(ed);
                            setTimeStep("1d");
                            setWmsLayers(layers);
                            setTrackSatellite("");
                            setActiveTab('render');
                          }}
                          className={`text-left p-3 rounded-xl border ${severityBorder} transition-all group`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getEventEmoji(ev)}</span>
                              <h3 className="font-semibold text-sm text-zinc-200 group-hover:text-red-400 transition-colors leading-tight">{ev.title}</h3>
                            </div>
                            <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">{getEventAge(ev)}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-7">
                            {mag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{mag}</span>}
                            <span className="text-[10px] text-zinc-600">{ev.categories[0]?.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 📚 HISTORICAL CASE STUDIES ── */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">📚 Historical Case Studies</h3>
                <div className="grid grid-cols-1 gap-2">
                  {EVENT_PRESETS.map((ev) => (
                    <button
                      key={ev.name}
                      type="button"
                      onClick={() => {
                        setBboxStr(ev.bbox);
                        setStartDate(ev.startDate);
                        setEndDate(ev.endDate);
                        setTimeStep(ev.timeStep);
                        setWmsLayers(ev.layers);
                        setTrackSatellite("");
                        setActiveTab('render');
                      }}
                      className="text-left p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{ev.emoji}</span>
                        <h3 className="font-semibold text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{ev.name}</h3>
                      </div>
                      <p className="text-[11px] text-zinc-600 ml-7">{ev.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {activeTab === 'render' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium">Bounding Box (BBOX)</label>
                    <button type="button" onClick={() => setShowMap(true)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-2.5 py-1 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all">
                      <Globe className="w-3.5 h-3.5" /> Select on Map
                    </button>
                  </div>
                  <input type="text" value={bboxStr} onChange={(e) => setBboxStr(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="-122.41, 37.77, -122.38, 37.80" />
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Quick Regions</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {REGION_PRESETS.map(r => (
                        <button type="button" key={r.name} onClick={() => setBboxStr(r.bbox)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-400 hover:text-blue-300 hover:bg-blue-500/15 border border-zinc-700/50 hover:border-blue-500/30 transition-all"
                          title={`Set BBOX to ${r.bbox}`}
                        >{r.emoji} {r.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orbital' && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl">
                  <label className="block text-xs uppercase tracking-wider text-cyan-500 mb-2 font-medium">Select Target Satellite</label>
                  <select
                    value={trackSatellite}
                    onChange={(e) => {
                      const satId = e.target.value;
                      setTrackSatellite(satId);
                      // Auto-populate WMS layers with compatible defaults
                      const config = getOrbitalConfig(satId);
                      if (config && config.defaultLayers.length > 0) {
                        setWmsLayers(config.defaultLayers.map(l => ({ ...l })));
                      }
                    }}
                    className="w-full bg-black/40 border border-cyan-900/50 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    required
                  >
                    <option value="" disabled>-- Select a Satellite --</option>
                    <optgroup label="🛰️ Imaging Satellites (have WMS layers)">
                      {ORBITAL_SATELLITE_CONFIG.filter(s => s.type === 'imaging').map(s => (
                        <option key={s.id} value={s.id}>{s.label} — {s.altKm}km</option>
                      ))}
                    </optgroup>
                    <optgroup label="🚀 Viewpoint Only (flying cameras)">
                      {ORBITAL_SATELLITE_CONFIG.filter(s => s.type === 'viewpoint').map(s => (
                        <option key={s.id} value={s.id}>{s.label} — {s.altKm}km</option>
                      ))}
                    </optgroup>
                  </select>
                  {(() => {
                    if (!trackSatellite) return null;
                    const config = getOrbitalConfig(trackSatellite);
                    if (!config) return null;

                    return (
                      <div className="mt-3 space-y-2">
                        {/* Satellite info */}
                        <div className="bg-black/20 p-3 rounded-lg border border-cyan-900/30 space-y-1.5">
                          <p className="text-[11px] text-cyan-300 font-medium">{config.instrument ? `Instrument: ${config.instrument}` : 'No imaging instrument'} • NORAD {config.noradId} • {config.altKm}km orbit</p>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">{config.description}</p>
                          <p className="text-[10px] text-cyan-400/80 leading-relaxed">📡 Camera will lock to the satellite&apos;s nadir point. BBOX moves dynamically with the orbit.</p>
                        </div>

                        {/* Type badge */}
                        {config.type === 'imaging' ? (
                          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                            <span className="text-emerald-400 text-xs font-bold">✅ IMAGING</span>
                            <span className="text-[10px] text-emerald-300/80">This satellite produces real WMS imagery. {config.compatibleLayers.length} compatible layer{config.compatibleLayers.length !== 1 ? 's' : ''} available.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                            <span className="text-amber-400 text-xs font-bold">📷 VIEWPOINT</span>
                            <span className="text-[10px] text-amber-300/80">No WMS layers from this satellite. Using it as a flying camera over other data.</span>
                          </div>
                        )}

                        {/* Compatible layers picker for imaging satellites */}
                        {config.type === 'imaging' && config.compatibleLayers.length > 0 && (
                          <div className="bg-black/20 p-2.5 rounded-lg border border-cyan-900/20">
                            <p className="text-[10px] uppercase tracking-wider text-cyan-500 mb-1.5 font-medium">Compatible Layers — click to add</p>
                            <div className="flex flex-wrap gap-1">
                              {config.compatibleLayers.map((cl, i) => {
                                const isActive = wmsLayers.some(l => l.name === cl.name);
                                const shortName = cl.name.replace('MODIS_Terra_', '').replace('MODIS_Aqua_', '').replace('VIIRS_SNPP_', '').replace('VIIRS_NOAA20_', '').replace('HLS_L30_', '').replace('HLS_S30_', '').replace('SMAP_L4_', '');
                                return (
                                  <button type="button" key={i} onClick={() => {
                                    if (isActive) {
                                      setWmsLayers(wmsLayers.filter(l => l.name !== cl.name));
                                    } else {
                                      setWmsLayers([...wmsLayers, { ...cl }]);
                                    }
                                  }} className={`text-[10px] px-2 py-1 rounded-md border transition-all ${isActive ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30'}`}>
                                    {isActive ? '✓ ' : '+ '}{shortName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Mismatch check for imaging satellites */}
                        {config.type === 'imaging' && wmsLayers.length > 0 && (() => {
                          const incompatible = wmsLayers.filter(l => !config.compatibleLayers.some(cl => cl.name === l.name));
                          if (incompatible.length === 0) return null;
                          return (
                            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                              <p className="text-[10px] text-red-400 font-medium">⚠ {incompatible.length} layer{incompatible.length !== 1 ? 's' : ''} from other satellites:</p>
                              {incompatible.map((l, i) => (
                                <p key={i} className="text-[10px] text-red-300/70 ml-3">• {l.name}</p>
                              ))}
                              <p className="text-[10px] text-red-300/60 mt-1">These layers are from different satellites and won&apos;t align with {trackSatellite}&apos;s swath.</p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">FPS</label>
                  <input type="number" value={fps} onChange={(e) => setFps(Number(e.target.value))} min={1} max={60} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">Frame Count</label>
                  <input type="number" value={frameCount} onChange={(e) => setFrameCount(Number(e.target.value))} min={1} max={1800} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                </div>
              </div>

              {(() => {
                const HIGH_FREQ_KEYWORDS = ['goes', 'himawari', 'nexrad', 'ahi'];
                const hasHighFreqLayer = wmsLayers.some(l =>
                  HIGH_FREQ_KEYWORDS.some(kw => l.name.toLowerCase().includes(kw) || l.url.toLowerCase().includes(kw))
                );
                return (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                      Temporal Resolution
                      {!hasHighFreqLayer && timeStep !== "1d" && (
                        <span className="ml-2 text-amber-400 normal-case">⚠ Sub-daily needs geostationary layers</span>
                      )}
                    </label>
                    <select
                      value={timeStep}
                      onChange={(e) => setTimeStep(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    >
                      <option value="1d">Daily (1 Frame / Day) — All Satellites</option>
                      {hasHighFreqLayer && (
                        <>
                          <option value="1h">Hourly (1 Frame / Hour) — Geostationary</option>
                          <option value="10m">10-Minute — GOES / Himawari Full Disk</option>
                          <option value="1m">1-Minute — Mesoscale Sector</option>
                        </>
                      )}
                    </select>
                    {!hasHighFreqLayer && (
                      <p className="text-[10px] text-zinc-600 mt-1">Add a GOES or Himawari layer to unlock sub-daily modes</p>
                    )}
                  </div>
                );
              })()}

              <div className="mt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium">WMS Layers</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowPresets(!showPresets)} className={`text-xs transition-colors px-2 py-1 rounded flex items-center gap-1 ${showPresets ? 'text-purple-300 bg-purple-400/20' : 'text-purple-400 hover:text-purple-300 bg-purple-400/10'}`}>
                      <Satellite className="w-3 h-3" /> Browse Satellites <ChevronDown className={`w-3 h-3 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
                    </button>
                    <button type="button" onClick={() => setWmsLayers([...wmsLayers, { url: "", name: "" }])} className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-2 py-1 rounded">
                      + Custom URL
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showPresets && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                      <div className="bg-zinc-900/60 border border-purple-500/20 rounded-lg p-3">
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          <button type="button" onClick={() => setPresetFilter("all")} className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${presetFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>All</button>
                          {CATEGORIES.map(cat => (
                            <button type="button" key={cat} onClick={() => setPresetFilter(cat)} className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${presetFilter === cat ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>{cat}</button>
                          ))}
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {SATELLITE_CATALOG.filter(s => presetFilter === 'all' || s.category === presetFilter).map((preset, i) => {
                            const compat = checkBboxCompatibility(bboxStr, preset.bboxConstraint);
                            return (
                            <button type="button" key={i} onClick={() => {
                              if (preset.suggestedBbox) setBboxStr(preset.suggestedBbox);
                              setWmsLayers([...wmsLayers, { url: preset.url, name: preset.layerName }]);
                              setShowPresets(false);
                            }} className={`w-full text-left p-2 rounded-lg hover:bg-zinc-700/50 border transition-all group ${!compat.ok ? 'bg-red-900/20 border-red-500/20 hover:border-red-500/40' : 'bg-zinc-800/50 border-zinc-800/50 hover:border-purple-500/30'}`}>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-200 font-medium group-hover:text-purple-300 transition-colors">{preset.name}</span>
                                <div className="flex gap-1.5 items-center">
                                  {preset.suggestedBbox && <span className="text-[10px] text-blue-400/80 bg-blue-400/10 px-1.5 py-0.5 rounded">📍 Auto BBOX</span>}
                                  <span className="text-[10px] text-emerald-400/80 bg-emerald-400/10 px-1.5 py-0.5 rounded">{preset.coverage}</span>
                                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{preset.frequency}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{preset.description}</p>
                              {compat.warning && <p className={`text-[10px] mt-1 ${compat.ok ? 'text-blue-400/70' : 'text-red-400/80'}`}>{compat.warning}</p>}
                            </button>
                          );})}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {wmsLayers.map((layer, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 border border-zinc-800/80 rounded-lg bg-zinc-900/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400 font-mono">Layer {idx} {idx===0?"(Base)":""}</span>
                        {wmsLayers.length > 1 && (
                          <button type="button" onClick={() => setWmsLayers(wmsLayers.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                      <input type="text" value={layer.url} onChange={(e) => { const newL = wmsLayers.map((l, i) => i === idx ? { ...l, url: e.target.value } : l); setWmsLayers(newL); }} placeholder="WMS Server URL" className="w-full bg-black/50 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                      <input type="text" value={layer.name} onChange={(e) => { const newL = wmsLayers.map((l, i) => i === idx ? { ...l, name: e.target.value } : l); setWmsLayers(newL); }} placeholder="Layer Name (e.g. MODIS_Terra)" className="w-full bg-black/50 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                      <div className="flex items-center gap-3 mt-1">
                        <label className="text-[10px] text-zinc-500 uppercase w-16">Opacity</label>
                        <input type="range" min="0" max="100" value={(layer.opacity ?? 1.0) * 100} onChange={(e) => { const newL = wmsLayers.map((l, i) => i === idx ? { ...l, opacity: parseInt(e.target.value)/100.0 } : l); setWmsLayers(newL); }} className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                        <span className="text-xs text-zinc-400 w-8 text-right">{Math.round((layer.opacity ?? 1.0) * 100)}%</span>
                      </div>
                      {(() => {
                        const info = getLayerSourceInfo(layer.name);
                        if (!info) return null;
                        return (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">📡 {info.satellite}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{info.instrument}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{info.overpassTime}</span>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>

                {/* ── Temporal Alignment Info ── */}
                {(() => {
                  const { sources, warning } = analyzeLayerAlignment(wmsLayers);
                  if (sources.length === 0) return null;
                  return (
                    <div className={`mt-2 p-2.5 rounded-lg border text-[11px] ${warning ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/30 border-zinc-800/50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-zinc-400 font-medium">{warning ? '⚠️ Temporal Alignment' : '📡 Source Info'}</span>
                      </div>
                      {warning && <p className="text-amber-400/80 mb-1.5">{warning}</p>}
                      <div className="flex flex-wrap gap-1">
                        {sources.map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 text-[10px]">
                            {s.satellite} / {s.instrument} — {s.overpassTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {error && (
                <div className="text-red-400 text-sm flex items-center bg-red-400/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
                </div>
              )}
              {activeJobId && (
                <div className="text-green-400 text-sm flex items-center bg-green-400/10 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" /> Job created: {activeJobId.slice(0, 8)}...
                </div>
              )}

              <div className="flex gap-3 mt-2">
                {activeTab !== 'orbital' && (
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</> : <><Play className="w-5 h-5 mr-2" /> Generate Video</>}
                  </button>
                )}
                <button type="button" onClick={() => setIsLiveStreamActive(true)} className={`${activeTab === 'orbital' ? 'w-full' : 'flex-1'} bg-purple-600/80 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center border border-purple-500/50`}>
                  <Film className="w-5 h-5 mr-2" /> {activeTab === 'orbital' ? 'Launch Orbital Tracker' : 'Live Stream'}
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Job History + Video Player */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-7 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center">
              <Film className="w-5 h-5 mr-2 text-purple-400" /> Batch Job History
            </h2>
            <button onClick={fetchJobs} className="text-zinc-400 hover:text-zinc-200 transition-colors p-2 rounded-lg hover:bg-zinc-800/50" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {jobsLoading && jobs.length === 0 ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading jobs...
              </motion.div>
            ) : jobs.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 text-zinc-600">
                <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No jobs yet. Create your first render job!</p>
              </motion.div>
            ) : (
              <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {jobs.map((job) => (
                  <div key={job.id}>
                    <div
                      onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                      className={`bg-zinc-900/40 border rounded-lg p-4 flex items-center justify-between transition-all cursor-pointer ${selectedJob?.id === job.id ? "border-blue-500/50 bg-zinc-900/60" : "border-zinc-800/50 hover:border-zinc-700/50"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 ${getStatusColor(job.status)}`}>{getStatusIcon(job.status)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-mono text-zinc-300 truncate">{job.id.slice(0, 8)}...{job.id.slice(-4)}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{new Date(job.created_at).toLocaleString()} • {job.frame_count} frames</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-medium uppercase tracking-wider ${getStatusColor(job.status)}`}>{job.status}</span>
                        {job.status === "PROCESSING" && (() => {
                          const pct = job.frame_count > 0 ? Math.round((job.processed_frames / job.frame_count) * 100) : 0;
                          const elapsed = (Date.now() - new Date(job.created_at).getTime()) / 1000;
                          const etaSec = pct > 0 ? Math.round((elapsed / pct) * (100 - pct)) : null;
                          const etaStr = etaSec ? (etaSec > 60 ? `~${Math.ceil(etaSec/60)}m left` : `~${etaSec}s left`) : "Calculating...";
                          return (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] text-zinc-500">{job.processed_frames}/{job.frame_count} ({pct}%)</span>
                              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-blue-400/70">{etaStr}</span>
                            </div>
                          );
                        })()}
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this video? This will permanently delete the MP4 from AWS S3.")) {
                              try {
                                await api.deleteJob(job.id);
                                setJobs(jobs.filter(j => j.id !== job.id));
                                if (selectedJob?.id === job.id) setSelectedJob(null);
                              } catch {
                                alert("Failed to delete job.");
                              }
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Delete Job"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Video Player or Error */}
                    <AnimatePresence>
                      {selectedJob?.id === job.id && job.status === "COMPLETED" && job.video_url && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <div className="mt-2 bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Film className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-zinc-200">Generated MP4 Export</span>
                            </div>
                            <video controls autoPlay loop className="w-full rounded-lg bg-black" src={resolveVideoUrl(job.video_url)}>
                              Your browser does not support video playback.
                            </video>

                            {/* Time-Series Activity Chart */}
                            {job.activity_metrics && job.activity_metrics.length > 0 && (
                              <div className="mt-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                                <h4 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                  Activity Analysis (Layer Coverage %)
                                </h4>
                                <div className="h-48 w-full">
                                  <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={100}>
                                    <LineChart data={job.activity_metrics.map((val, idx) => ({ day: idx + 1, activity: val }))}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                      <XAxis dataKey="day" stroke="#52525b" tick={{fill: '#52525b', fontSize: 12}} minTickGap={20} />
                                      <YAxis stroke="#52525b" tick={{fill: '#52525b', fontSize: 12}} width={35} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                        formatter={(value) => [`${Number(value || 0).toFixed(2)}%`, 'Activity']}
                                        labelFormatter={(label) => `Day ${label}`}
                                      />
                                      <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#60a5fa', stroke: '#000' }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-3">
                              <button onClick={() => setEnlargedVideoUrl(resolveVideoUrl(job.video_url!))} className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-3 py-1.5 rounded-lg">
                                <Maximize2 className="w-4 h-4" /> Enlarge
                              </button>
                              <a 
                                href={`${resolveVideoUrl(job.video_url!)}?download=1`} 
                                download={`geostream_${job.id.slice(0, 8)}.mp4`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors bg-green-400/10 px-3 py-1.5 rounded-lg"
                              >
                                <Download className="w-4 h-4" /> Download MP4
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {selectedJob?.id === job.id && job.status === "FAILED" && job.error_message && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-2 bg-red-400/5 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs text-red-400 font-mono">{job.error_message}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Live Stream Modal */}
      <AnimatePresence>
        {isLiveStreamActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden w-full max-w-5xl shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="font-semibold text-zinc-100">Live MJPEG Stream</h3>
                  </div>
                  {wmsLayers.length >= 2 && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                      <input type="checkbox" checked={isSwipeMode} onChange={(e) => setIsSwipeMode(e.target.checked)} className="rounded border-zinc-700 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-zinc-900" />
                      Swipe Compare
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      // Find the currently displayed image
                      const img = document.querySelector('.live-stream-img') as HTMLImageElement;
                      if (!img) return;
                      
                      const canvas = document.createElement('canvas');
                      canvas.width = img.naturalWidth || 1920;
                      canvas.height = img.naturalHeight || 1080;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      
                      ctx.drawImage(img, 0, 0);
                      const url = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `geostream_snapshot_${Date.now()}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-lg border border-emerald-400/20"
                  >
                    <Camera className="w-4 h-4" />
                    Snapshot
                  </button>
                  <button onClick={() => setIsLiveStreamActive(false)} className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="bg-black aspect-video w-full flex items-center justify-center relative overflow-hidden">
                {!isSwipeMode ? (
                  <img 
                    src={`${api.API_BASE}/api/stream/live?bbox=${encodeURIComponent(bboxStr)}&start_date=${startDate}&end_date=${endDate}&layers=${encodeURIComponent(JSON.stringify(wmsLayers))}&time_step=${timeStep}${trackSatellite ? `&track_satellite=${trackSatellite}` : ''}&token=${typeof window !== 'undefined' ? localStorage.getItem('geostream_token') : ''}`} 
                    alt="Live WMS Stream"
                    className="live-stream-img w-full h-full object-contain"
                    crossOrigin="anonymous"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <>
                    <img 
                      src={`${api.API_BASE}/api/stream/live?bbox=${encodeURIComponent(bboxStr)}&start_date=${startDate}&end_date=${endDate}&layers=${encodeURIComponent(JSON.stringify([wmsLayers[0]]))}&time_step=${timeStep}${trackSatellite ? `&track_satellite=${trackSatellite}` : ''}&token=${typeof window !== 'undefined' ? localStorage.getItem('geostream_token') : ''}`} 
                      alt="Base Layer"
                      className="live-stream-img absolute inset-0 w-full h-full object-contain"
                      crossOrigin="anonymous"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <img 
                      src={`${api.API_BASE}/api/stream/live?bbox=${encodeURIComponent(bboxStr)}&start_date=${startDate}&end_date=${endDate}&layers=${encodeURIComponent(JSON.stringify(wmsLayers.slice(1)))}&time_step=${timeStep}${trackSatellite ? `&track_satellite=${trackSatellite}` : ''}&token=${typeof window !== 'undefined' ? localStorage.getItem('geostream_token') : ''}`} 
                      alt="Overlay Layers"
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ clipPath: `inset(0 0 0 ${swipePosition}%)` }}
                      crossOrigin="anonymous"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={swipePosition} 
                      onChange={(e) => setSwipePosition(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                    />
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-0 pointer-events-none"
                      style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-8 bg-white rounded flex items-center justify-center shadow-md">
                        <div className="w-0.5 h-4 bg-zinc-400 mx-0.5"></div>
                        <div className="w-0.5 h-4 bg-zinc-400 mx-0.5"></div>
                      </div>
                    </div>
                  </>
                )}
                <div className="absolute inset-0 flex items-center justify-center -z-20 text-zinc-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enlarged Video Modal */}
      <AnimatePresence>
        {enlargedVideoUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setEnlargedVideoUrl(null)}>
            <div className="w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <button onClick={() => setEnlargedVideoUrl(null)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                  <XCircle className="w-7 h-7" />
                </button>
              </div>
              <video controls autoPlay loop className="w-full rounded-xl bg-black shadow-2xl" src={enlargedVideoUrl}>
                Your browser does not support video playback.
              </video>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      {showMap && (
        <MapPicker
          currentBbox={bboxStr}
          onSelect={(bbox) => setBboxStr(bbox)}
          onClose={() => setShowMap(false)}
        />
      )}
    </main>
  );
}
