/**
 * AqiData.js
 * Data-access layer — fetches from the WAQI API and normalises the response.
 * Requires WAQI_TOKEN in your .env file (get one free at https://aqicn.org/data-platform/token/)
 */

import dotenv from "dotenv";
dotenv.config();

import dotenv from "dotenv";
dotenv.config(); // ← MUST be before process.env is read

const BASE_URL = "https://api.waqi.info";
const TOKEN = process.env.WAQI_TOKEN;

if (!TOKEN) {
  console.warn("⚠️  WAQI_TOKEN is not set. AQI requests will fail.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps a numeric AQI value to a descriptive category + colour.
 * @param {number} aqi
 * @returns {{ label: string, color: string }}
 */
export function categoriseAqi(aqi) {
  if (aqi <= 50)  return { label: "Good",            color: "#00e400" };
  if (aqi <= 100) return { label: "Moderate",        color: "#ffff00" };
  if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#ff7e00" };
  if (aqi <= 200) return { label: "Unhealthy",       color: "#ff0000" };
  if (aqi <= 300) return { label: "Very Unhealthy",  color: "#8f3f97" };
  return              { label: "Hazardous",          color: "#7e0023" };
}

/**
 * Normalises a raw WAQI station data block into a clean object.
 * @param {object} raw  – the `data` field from the WAQI response
 */
function normalise(raw) {
  const aqi = Number(raw.aqi);
  const { label, color } = categoriseAqi(aqi);

  return {
    aqi,
    category: label,
    color,
    city: raw.city?.name ?? "Unknown",
    lat: raw.city?.geo?.[0] ?? null,
    lng: raw.city?.geo?.[1] ?? null,
    time: raw.time?.s ?? new Date().toISOString(),
    dominentPollutant: raw.dominentpol ?? null,
    pollutants: {
      pm25: raw.iaqi?.pm25?.v ?? null,
      pm10: raw.iaqi?.pm10?.v ?? null,
      o3:   raw.iaqi?.o3?.v   ?? null,
      no2:  raw.iaqi?.no2?.v  ?? null,
      so2:  raw.iaqi?.so2?.v  ?? null,
      co:   raw.iaqi?.co?.v   ?? null,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch AQI for a city name or station keyword.
 * @param {string} city
 * @returns {Promise<object|null>}
 */
export async function fetchAqiByCity(city) {
  try {
    const url = `${BASE_URL}/feed/${encodeURIComponent(city)}/?token=${TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "ok") return null;
    return normalise(json.data);
  } catch (err) {
    console.error("fetchAqiByCity error:", err.message);
    return null;
  }
}

/**
 * Fetch AQI for a lat/lng pair.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<object|null>}
 */
export async function fetchAqiByGeo(lat, lng) {
  try {
    const url = `${BASE_URL}/feed/geo:${lat};${lng}/?token=${TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "ok") return null;
    return normalise(json.data);
  } catch (err) {
    console.error("fetchAqiByGeo error:", err.message);
    return null;
  }
}

/**
 * Fetch up to 10 nearby monitoring stations for map markers.
 * Uses the WAQI map/bounds endpoint.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [delta=1]  – degree radius around the point
 * @returns {Promise<object[]>}
 */
export async function fetchNearbyStations(lat, lng, delta = 1) {
  try {
    const bounds = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;
    const url = `${BASE_URL}/map/bounds/?token=${TOKEN}&latlng=${bounds}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "ok") return [];

    return json.data.slice(0, 10).map((s) => {
      const aqi = Number(s.aqi);
      const { label, color } = categoriseAqi(isNaN(aqi) ? 0 : aqi);
      return {
        uid: s.uid,
        aqi: isNaN(aqi) ? null : aqi,
        category: label,
        color,
        city: s.station?.name ?? "Unknown",
        lat: s.lat,
        lng: s.lon,
      };
    });
  } catch (err) {
    console.error("fetchNearbyStations error:", err.message);
    return [];
  }
}
