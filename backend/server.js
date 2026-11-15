import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Routes
import userPaymentRoutes from "./routes/userPayments.js";

// Load Environment Variables
dotenv.config();

const app = express();

/* ----------------------- PROCESS CRASH PROTECTION ----------------------- */
// Prevent Node.js process from exiting on unexpected network or query errors
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection (prevented crash):", reason);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception (prevented crash):", error);
});

/* ------------------------------ SECURITY & CORS ------------------------------ */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Resilient CORS configuration - allows requests from any origin with credentials
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);

app.set("trust proxy", 1);

/* ------------------------------ PARSERS ------------------------------ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------ DATABASE ------------------------------ */
let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI missing in environment variables.");
    throw new Error("MONGODB_URI missing in environment variables.");
  }

  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Reconnect listeners
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected! Attempting auto-reconnect...");
  connectDB().catch((err) => console.error("Reconnect error:", err.message));
});

mongoose.connection.on("error", (err) => {
  console.error("⚠️ MongoDB connection error:", err.message);
});

/* ------------------------------ ROUTES ------------------------------ */
app.use(
  "/api/user-payments",
  async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: err.message,
      });
    }
  },
  userPaymentRoutes
);

// Health Check
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({
      success: true,
      message: "Server is running healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Root
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Raghuram Finance / Chit Fund API is running!",
    version: "1.0.0",
  });
});

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global Error Handler with guaranteed CORS headers
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

/* ----------------------- EXPORT FOR VERCEL ----------------------- */
const handler = app;
export default handler;

/* ----------------------- LOCAL DEVELOPMENT ONLY ----------------------- */
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectDB().catch((err) => {
      console.warn("⚠️ Initial DB connection warning:", err.message);
    });
  });
}
