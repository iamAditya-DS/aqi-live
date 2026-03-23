import { Router } from "express";
import { fetchAqiByCity, fetchAqiByGeo, fetchNearbyStations } from "../models/AqiData.js";

const router = Router();

/**
 * GET /api/aqi/city/:city
 * Returns current AQI for a named city / station.
 */
router.get("/city/:city", async (req, res) => {
    const { city } = req.params;
    if (!city?.trim()) return res.status(400).json({ error: "City name is required" });

    const data = await fetchAqiByCity(city.trim());
    if (!data) return res.status(404).json({ error: `No AQI data found for "${city}"` });

    res.json(data);
});

/**
 * GET /api/aqi/geo/:lat/:lng
 * Returns current AQI for a latitude/longitude pair.
 */
router.get("/geo/:lat/:lng", async (req, res) => {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);

    if (isNaN(lat) || isNaN(lng))
        return res.status(400).json({ error: "Invalid coordinates" });

    const data = await fetchAqiByGeo(lat, lng);
    if (!data) return res.status(404).json({ error: "No AQI data for this location" });

    res.json(data);
});

/**
 * GET /api/aqi/nearby/:lat/:lng
 * Returns up to 10 nearby monitoring stations for the map markers.
 */
router.get("/nearby/:lat/:lng", async (req, res) => {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);

    if (isNaN(lat) || isNaN(lng))
        return res.status(400).json({ error: "Invalid coordinates" });

    const stations = await fetchNearbyStations(lat, lng);
    res.json(stations);
});

export default router;