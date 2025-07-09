import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/environment";
import { database } from "./config/database";
import { redis } from "./config/redis";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import bookingRoutes from "./routes/bookings";

const app = express();

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS - Allow all origins for development
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint for Cloud Run
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hotel Booking System API - Health Check",
    status: "healthy",
    timestamp: new Date(),
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Hotel Booking System API",
    version: "1.0.0",
    timestamp: new Date(),
    endpoints: {
      auth: "/api/auth",
      rooms: "/api/rooms",
      bookings: "/api/bookings",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date(),
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connection
    await database.disconnect();
    console.log("✅ Database disconnected");

    // Close Redis connection
    await redis.disconnect();
    console.log("✅ Redis disconnected");

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle process signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Connect to external services with retries
async function connectToServices() {
  console.log("🔗 Connecting to external services...");

  // Connect to MongoDB with retries
  for (let i = 0; i < 3; i++) {
    try {
      await database.connect();
      console.log("✅ MongoDB connected successfully");
      break;
    } catch (error) {
      console.warn(`⚠️ MongoDB connection attempt ${i + 1}/3 failed:`, error);
      if (i === 2) {
        console.error("❌ MongoDB connection failed after 3 attempts");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
      }
    }
  }

  // Connect to Redis with retries
  for (let i = 0; i < 3; i++) {
    try {
      await redis.connect();
      console.log("✅ Redis connected successfully");
      break;
    } catch (error) {
      console.warn(`⚠️ Redis connection attempt ${i + 1}/3 failed:`, error);
      if (i === 2) {
        console.error("❌ Redis connection failed after 3 attempts");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
      }
    }
  }
}

// Start server
async function startServer() {
  try {
    // Start server first - don't wait for database connections
    const server = app.listen(config.server.port, () => {
      console.log(`🌐 Server running on port ${config.server.port}`);
      console.log(`📍 API URL: http://localhost:${config.server.port}/api`);
      console.log("🎉 Hotel Booking System API is ready!");
    });

    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${config.server.port} is already in use`);
      } else {
        console.error("❌ Server error:", error);
      }
      process.exit(1);
    });

    // Connect to services in background after server starts
    connectToServices().catch((error) => {
      console.error("⚠️ Some external services failed to connect:", error);
      // Don't exit - let the server continue running
    });

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
