import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import adminRoutes from "./routes/admin.js";
import billingRoutes from "./routes/billing.js";

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

const origins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.includes("*") ? true : origins,
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString(),
  });
});

app.use("/api", authRoutes);
app.use("/api", dataRoutes);
app.use("/api", billingRoutes);
app.use("/api", adminRoutes);

app.use((req, res) => res.status(404).json({ success: false, error: "Not found" }));

async function start() {
  if (!MONGODB_URI) {
    console.error("✖ MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");
    app.listen(PORT, () => console.log(`✓ API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error("✖ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

start();
