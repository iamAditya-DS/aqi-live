/**
 * AqiData.js
 * Data-access layer — fetches from the OpenWeatherMap Air Pollution API.
 * Requires OWM_TOKEN in your .env file (free at openweathermap.org/api)
 */

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";
const TOKEN = process.env.OWM_TOKEN;

if (!TOKEN) {
    console.warn("⚠️  OWM_TOKEN is not set. AQI requests will fail.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts OpenWeatherMap AQI index (1–5) to a numeric AQI + category + color.
 */
function mapOwmAqi(owmIndex) {
    const map = {
        1: { aqi: 25, label: "Good", color: "#00e400" },
        2: { aqi: 75, label: "Moderate", color: "#ffff00" },
        3: { aqi: 125, label: "Unhealthy (Sensitive)", color: "#ff7e00" },
        4: { aqi: 175, label: "Unhealthy", color: "#ff0000" },
        5: { aqi: 250, label: "Very Unhealthy", color: "#8f3f97" },
    };
    return map[owmIndex] ?? { aqi: 0, label: "Unknown", color: "#94a3b8" };
}

export function categoriseAqi(aqi) {
    if (aqi <= 50) return { label: "Good", color: "#00e400" };
    if (aqi <= 100) return { label: "Moderate", color: "#ffff00" };
    if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#ff7e00" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#ff0000" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "#8f3f97" };
    return { label: "Hazardous", color: "#7e0023" };
}

/**
 * Normalises an OWM air pollution response into our standard format.
 */
function normalise(data, cityName, lat, lng) {
    const components = data.list[0].components;
    const owmIndex = data.list[0].main.aqi;
    const { aqi, label, color } = mapOwmAqi(owmIndex);

    const pollutantMap = {
        pm25: components.pm2_5,
        pm10: components.pm10,
        o3: components.o3,
        no2: components.no2,
        so2: components.so2,
        co: components.co,
    };
    const dominant = Object.entries(pollutantMap).sort((a, b) => b[1] - a[1])[0][0];

    return {
        aqi,
        category: label,
        color,
        city: cityName,
        lat,
        lng,
        time: new Date(data.list[0].dt * 1000).toISOString(),
        dominentPollutant: dominant,
        pollutants: {
            pm25: components.pm2_5 ?? null,
            pm10: components.pm10 ?? null,
            o3: components.o3 ?? null,
            no2: components.no2 ?? null,
            so2: components.so2 ?? null,
            co: components.co ?? null,
        },
    };
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

async function geocodeCity(city) {
    const url = `${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.length) return null;
    return { lat: json[0].lat, lng: json[0].lon, name: `${json[0].name}, ${json[0].country}` };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchAqiByCity(city) {
    try {
        const geo = await geocodeCity(city);
        if (!geo) return null;
        return await fetchAqiByGeo(geo.lat, geo.lng, geo.name);
    } catch (err) {
        console.error("fetchAqiByCity error:", err.message);
        return null;
    }
}

export async function fetchAqiByGeo(lat, lng, cityName = "Your Location") {
    try {
        if (cityName === "Your Location") {
            const url = `${GEO_URL}/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${TOKEN}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.length) cityName = `${json[0].name}, ${json[0].country}`;
        }
        const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lng}&appid=${TOKEN}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.list?.length) return null;
        return normalise(json, cityName, lat, lng);
    } catch (err) {
        console.error("fetchAqiByGeo error:", err.message);
        return null;
    }
}

export async function fetchNearbyStations(lat, lng) {
    try {
        const offsets = [
            [-0.3, -0.3], [-0.3, 0], [-0.3, 0.3],
            [0, -0.3], [0, 0.3],
            [0.3, -0.3], [0.3, 0], [0.3, 0.3],
        ];

        const results = await Promise.all(
            offsets.map(async ([dlat, dlng], i) => {
                const pLat = +(lat + dlat).toFixed(4);
                const pLng = +(lng + dlng).toFixed(4);

                // Fetch AQI + reverse geocode in parallel
                const [aqiRes, geoRes] = await Promise.all([
                    fetch(`${BASE_URL}/air_pollution?lat=${pLat}&lon=${pLng}&appid=${TOKEN}`),
                    fetch(`${GEO_URL}/reverse?lat=${pLat}&lon=${pLng}&limit=1&appid=${TOKEN}`),
                ]);

                const aqiJson = await aqiRes.json();
                const geoJson = await geoRes.json();

                if (!aqiJson.list?.length) return null;

                const { aqi, label, color } = mapOwmAqi(aqiJson.list[0].main.aqi);
                const components = aqiJson.list[0].components;

                // Real city name from reverse geocoding
                const cityName = geoJson.length
                    ? `${geoJson[0].name}, ${geoJson[0].state ?? geoJson[0].country}`
                    : `Station ${i + 1}`;

                return {
                    uid: i,
                    aqi,
                    category: label,
                    color,
                    city: cityName,
                    lat: pLat,
                    lng: pLng,
                    // Extra info for popup
                    pollutants: {
                        pm25: components.pm2_5 ?? null,
                        pm10: components.pm10 ?? null,
                        no2: components.no2 ?? null,
                        co: components.co ?? null,
                    },
                };
            })
        );

        return results.filter(Boolean);
    } catch (err) {
        console.error("fetchNearbyStations error:", err.message);
        return [];
    }
}