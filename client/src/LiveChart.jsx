/**
 * LiveChart.jsx
 * Main AQI dashboard component.
 * Features:
 *  - Search by city  OR  detect current location
 *  - Live AQI gauge + pollutant breakdown (Recharts)
 *  - Interactive map with nearby station markers (React-Leaflet)
 *  - Auto-refreshes every 5 minutes
 *
 * Dependencies (install before use):
 *   npm install recharts leaflet react-leaflet
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getAqiByCity, getAqiByGeo, getNearbyStations, getUserLocation } from "./api.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

const POLLUTANT_LABELS = {
  pm25: "PM2.5",
  pm10: "PM10",
  o3: "O₃",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AqiGauge({ aqi, color, category }) {
  const capped = Math.min(aqi, 500);
  const data = [{ name: "AQI", value: capped, fill: color }];

  return (
    <div className="gauge-wrapper">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          cx="50%" cy="85%"
          innerRadius="60%" outerRadius="90%"
          startAngle={180} endAngle={0}
          data={data}
          barSize={22}
        >
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#e5e7eb" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="gauge-label" style={{ color }}>
        <span className="gauge-number">{aqi}</span>
        <span className="gauge-category">{category}</span>
      </div>
    </div>
  );
}

function PollutantBar({ pollutants }) {
  const data = Object.entries(pollutants)
    .filter(([, v]) => v !== null)
    .map(([key, value]) => ({ name: POLLUTANT_LABELS[key], value }));

  if (!data.length) return <p className="muted">No pollutant data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${v} µg/m³`, "Level"]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 6]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function AqiMap({ center, stations }) {
  if (!center) return null;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      style={{ height: "360px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((s) => (
        <CircleMarker
          key={s.uid ?? `${s.lat}-${s.lng}`}
          center={[s.lat, s.lng]}
          radius={14}
          pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.75 }}
        >
          <Popup>
            <strong>{s.city}</strong>
            <br />AQI: <span style={{ color: s.color, fontWeight: 700 }}>{s.aqi ?? "N/A"}</span>
            <br />{s.category}
            {s.pollutants && (
              <>
                <br /><br />
                <strong>Pollutants:</strong><br />
                {s.pollutants.pm25 != null && <>PM2.5: {s.pollutants.pm25} µg/m³<br /></>}
                {s.pollutants.pm10 != null && <>PM10: {s.pollutants.pm10} µg/m³<br /></>}
                {s.pollutants.no2 != null && <>NO₂: {s.pollutants.no2} µg/m³<br /></>}
                {s.pollutants.co != null && <>CO: {s.pollutants.co} µg/m³</>}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LiveChart() {
  const [query, setQuery] = useState("");
  const [aqiData, setAqiData] = useState(null);
  const [stations, setStations] = useState([]);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // ── Core fetch logic ──────────────────────────────────────────────────────

  const loadByGeo = useCallback(async (lat, lng) => {
    setLoading(true);
    setError(null);
    try {
      const [data, nearby] = await Promise.all([
        getAqiByGeo(lat, lng),
        getNearbyStations(lat, lng),
      ]);
      setAqiData(data);
      setStations(nearby);
      setCenter({ lat, lng });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadByCity = useCallback(async (city) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAqiByCity(city);
      setAqiData(data);
      if (data.lat && data.lng) {
        const nearby = await getNearbyStations(data.lat, data.lng);
        setStations(nearby);
        setCenter({ lat: data.lat, lng: data.lng });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  const scheduleRefresh = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (center) loadByGeo(center.lat, center.lng);
    }, REFRESH_MS);
  }, [center, loadByGeo]);

  useEffect(() => {
    scheduleRefresh();
    return () => clearInterval(timerRef.current);
  }, [scheduleRefresh]);

  // ── On mount: try geolocation ─────────────────────────────────────────────

  useEffect(() => {
    getUserLocation()
      .then(({ lat, lng }) => loadByGeo(lat, lng))
      .catch(() => loadByCity("Delhi")); // sensible default
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) loadByCity(query.trim());
  };

  const handleLocate = () => {
    getUserLocation()
      .then(({ lat, lng }) => loadByGeo(lat, lng))
      .catch((e) => setError(e.message));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="aqi-dashboard">
      {/* ── Header ── */}
      <header className="aqi-header">
        <h1>🌿 AQI Live</h1>
        <p className="subtitle">Real-time Air Quality Index</p>
      </header>

      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>Search</button>
        <button type="button" onClick={handleLocate} disabled={loading} className="locate-btn">
          📍 My Location
        </button>
      </form>

      {/* ── Status ── */}
      {loading && <div className="status-banner loading">Fetching data…</div>}
      {error && <div className="status-banner error">⚠ {error}</div>}

      {/* ── Data cards ── */}
      {aqiData && !loading && (
        <>
          <div className="cards-row">
            {/* Gauge */}
            <div className="card">
              <h2>{aqiData.city}</h2>
              <p className="last-updated">Updated: {new Date(aqiData.time).toLocaleTimeString()}</p>
              <AqiGauge aqi={aqiData.aqi} color={aqiData.color} category={aqiData.category} />
              {aqiData.dominentPollutant && (
                <p className="dominant">
                  Dominant pollutant: <strong>{aqiData.dominentPollutant.toUpperCase()}</strong>
                </p>
              )}
            </div>

            {/* Pollutant breakdown */}
            <div className="card">
              <h2>Pollutant Breakdown</h2>
              <PollutantBar pollutants={aqiData.pollutants} />
            </div>
          </div>

          {/* Map */}
          <div className="card map-card">
            <h2>Nearby Monitoring Stations</h2>
            <AqiMap center={center} stations={stations} />
          </div>
        </>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: 'Segoe UI', sans-serif; }

        .aqi-dashboard {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .aqi-header { text-align: center; margin-bottom: 24px; }
        .aqi-header h1 { font-size: 2rem; color: #1e293b; }
        .subtitle { color: #64748b; margin-top: 4px; }

        .search-bar {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-bar input {
          flex: 1;
          max-width: 340px;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
        }
        .search-bar input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #e0e7ff; }
        .search-bar button {
          padding: 10px 18px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background .2s;
        }
        .search-bar button:hover:not(:disabled) { background: #4f46e5; }
        .search-bar button:disabled { opacity: .5; cursor: not-allowed; }
        .locate-btn { background: #0ea5e9 !important; }
        .locate-btn:hover:not(:disabled) { background: #0284c7 !important; }

        .status-banner {
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .status-banner.loading { background: #dbeafe; color: #1d4ed8; }
        .status-banner.error   { background: #fee2e2; color: #b91c1c; }

        .cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 680px) { .cards-row { grid-template-columns: 1fr; } }

        .card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,.07);
        }
        .card h2 { font-size: 1.1rem; color: #1e293b; margin-bottom: 8px; }
        .map-card { margin-bottom: 0; }

        .last-updated { font-size: .8rem; color: #94a3b8; margin-bottom: 12px; }
        .dominant     { font-size: .85rem; color: #64748b; margin-top: 10px; text-align: center; }
        .muted        { color: #94a3b8; font-size: .9rem; margin-top: 16px; }

        .gauge-wrapper { position: relative; text-align: center; }
        .gauge-label {
          position: absolute;
          bottom: 16px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .gauge-number   { font-size: 2.4rem; font-weight: 700; line-height: 1; }
        .gauge-category { font-size: .85rem; font-weight: 600; margin-top: 4px; }
      `}</style>
    </div>
  );
}