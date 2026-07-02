/*
 * API client for the optional Node + MongoDB backend.
 *
 * Set VITE_API_URL to point at your server (e.g. http://localhost:4000/api).
 * When it is not set, requests short-circuit with a "Failed to fetch" error
 * instead of hitting a non-existent route — so the app silently falls back to
 * Firebase / local auth without 404 noise in the console.
 *
 * The signed-in JWT (stored as `nile_token`) is attached automatically.
 */
// Runtime override first (set via the in-app "Connect MongoDB Server" tool —
// the only way an installed APK/PWA can point at a server), then build-time env.
function runtimeUrl() {
  try { return localStorage.getItem("nile_api_url") || ""; } catch { return ""; }
}
const BASE = (runtimeUrl() || (import.meta.env && import.meta.env.VITE_API_URL) || "").replace(/\/+$/, "");

export const apiEnabled = Boolean(BASE);

function offlineError() {
  // Message includes "fetch" so the app's offline detection triggers cleanly.
  return new Error("Failed to fetch (no API server configured)");
}

function authHeader() {
  try {
    const token = localStorage.getItem("nile_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(method, endpoint, data, options = {}) {
  if (!BASE) throw offlineError();
  const res = await fetch(BASE + endpoint, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader(), ...options.headers },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    ...options,
  });
  if (!res.ok) {
    let message = `HTTP error! status: ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  get: (endpoint, options) => request("GET", endpoint, undefined, options),
  post: (endpoint, data = {}, options) => request("POST", endpoint, data, options),
  put: (endpoint, data = {}, options) => request("PUT", endpoint, data, options),
  delete: (endpoint, options) => request("DELETE", endpoint, undefined, options),
};
