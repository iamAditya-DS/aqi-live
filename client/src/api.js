/**
 * api.js  –  Frontend data-fetching helpers
 * All calls go through the Express backend to keep the WAQI token server-side.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Generic fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── AQI endpoints ─────────────────────────────────────────────────────────────

/**
 * Fetch AQI for a city name.
 * @param {string} city
 * @returns {Promise<AqiResult>}
 */
export async function getAqiByCity(city) {
  return apiFetch(`/aqi/city/${encodeURIComponent(city)}`);
}

/**
 * Fetch AQI for the user's current GPS coordinates.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<AqiResult>}
 */
export async function getAqiByGeo(lat, lng) {
  return apiFetch(`/aqi/geo/${lat}/${lng}`);
}

/**
 * Fetch nearby AQI monitoring stations for map markers.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<StationResult[]>}
 */
export async function getNearbyStations(lat, lng) {
  return apiFetch(`/aqi/nearby/${lat}/${lng}`);
}

/**
 * Attempt to get the user's current position via the browser Geolocation API.
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { timeout: 8000 }
    );
  });
}
