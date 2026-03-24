<div align="center">

# 🌿 AQI Live

### Real-time Air Quality Index Monitor

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-API-EB6E4B?style=flat-square)](https://openweathermap.org/api/air-pollution)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**Search any city worldwide and get live air quality data — instantly.**

[🚀 Live Demo](https://aqi-live-seven.vercel.app/) · [🐛 Report Bug](../../issues) · [💡 Request Feature](../../issues)

</div>

---

## 📸 Preview

> *(Add a screenshot of your app here — drag and drop an image into this file on GitHub)*

---

## ✨ What it does

- 🔍 Search **any city in the world** for real-time AQI
- 📍 **Detect your location** automatically via GPS
- 📊 **Radial AQI gauge** — colour-coded from Good to Hazardous
- 📈 **Pollutant breakdown chart** — PM2.5, PM10, O₃, NO₂, SO₂, CO
- 🗺️ **Interactive map** — nearby monitoring stations with real city names and pollutant data on click
- 🔄 **Auto-refreshes** every 5 minutes

---

## 🛠️ Built With

- **Frontend** — React 18 + Vite, Recharts, React-Leaflet
- **Backend** — Node.js + Express 5
- **Data** — OpenWeatherMap Air Pollution API
- **Maps** — Leaflet + OpenStreetMap

---

## 🚀 Running Locally

### Prerequisites
- Node.js v18+
- Free API key from [OpenWeatherMap](https://openweathermap.org/api/air-pollution)

### Clone
```bash
git clone https://github.com/YOUR-USERNAME/aqi-live.git
cd aqi-live
```

### Backend
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
OWM_TOKEN=your_api_key_here
PORT=5000
CLIENT_URL=http://localhost:5173
```
```bash
npm start
```

### Frontend
```bash
cd ../client
npm install
```
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
```bash
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 🌐 API Reference

| Endpoint | Description |
|---|---|
| `GET /api/aqi/city/:city` | AQI by city name |
| `GET /api/aqi/geo/:lat/:lng` | AQI by coordinates |
| `GET /api/aqi/nearby/:lat/:lng` | Nearby monitoring stations |

---

## 🎨 AQI Scale

| Range | Category | |
|---|---|---|
| 0 – 50 | Good | 🟢 |
| 51 – 100 | Moderate | 🟡 |
| 101 – 150 | Unhealthy for Sensitive Groups | 🟠 |
| 151 – 200 | Unhealthy | 🔴 |
| 201 – 300 | Very Unhealthy | 🟣 |
| 300+ | Hazardous | ⚫ |

---

## 📄 License

MIT — free to use, modify and distribute.

---

<div align="center">
Made with 💚 by <a href="https://github.com/iamAditya-DS">Aditya</a>
</div>
