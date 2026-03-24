import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import aqiRoutes from "./routes/aqiRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://aqi-live-seven.vercel.app",
        ],
        methods: ["GET"],
    })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/aqi", aqiRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`🌿 AQI server running on http://localhost:${PORT}`);
});