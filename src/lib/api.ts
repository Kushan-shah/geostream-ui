// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface Job {
  id: string;
  user_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  frame_count: number;
  processed_frames: number;
  video_url?: string;
  activity_metrics?: number[];
  created_at: string;
  error_message?: string;
}

interface WMSLayer {
  url: string;
  name: string;
  opacity?: number;
}

interface CreateJobPayload {
  bbox: number[];
  start_date: string;
  end_date: string;
  time_step?: string;
  track_satellite?: string;
  fps: number;
  frame_count: number;
  wms_layers: WMSLayer[];
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("geostream_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.trim() || "Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.trim() || "Login failed");
  }
  return res.json();
}

export async function createJob(payload: CreateJobPayload): Promise<{ job_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.trim() || "Failed to create job");
  }
  return res.json();
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
	const data = await res.json();
	return data || [];
}

export async function deleteJob(jobId: string): Promise<void> {
	const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text.trim() || "Failed to delete job");
	}
}

export function streamJobProgress(
  jobId: string,
  onEvent: (data: { status: string; processed: number; total: number; video_url?: string }) => void,
  onError: (err: Event) => void
): EventSource {
  const token = getToken();
  const es = new EventSource(
    `${API_BASE}/api/jobs/progress/stream?job_id=${jobId}&token=${token}`
  );
  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      // ignore parse errors
    }
  };
  es.onerror = onError;
  return es;
}

export type { AuthResponse, Job, CreateJobPayload, WMSLayer };
