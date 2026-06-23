import express, { Request, Response, NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import prisma from "./config/prisma.js";
import {
  isRedisAvailable,
  disconnectRedis,
  checkRedisMemory,
} from "./config/redis.js";
import { destroyR2Client } from "./config/r2.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import partnersRoutes from "./routes/partnersRoutes.js";
import leadsRoutes from "./routes/leadsRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { validateJWTConfig } from "./utils/jwtValidator.js";

// Load environment variables
dotenv.config();

// Validate JWT configuration on startup
try {
  validateJWTConfig();
} catch (error) {
  console.error(
    "❌ JWT Configuration Error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}

// Create Express app
const app = express();

// Prisma connection is lazy; validate JWT config first and then rely on Prisma client.

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// CORS configuration with multiple origin support
const getAllowedOrigins = (): string[] => {
  const origins =
    process.env.ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";
  console.log("ALLOWED_ORIGINS env:", process.env.ALLOWED_ORIGINS);
  console.log(
    "Parsed origins:",
    origins.split(",").map((o) => o.trim()),
  );
  return origins.split(",").map((o) => o.trim());
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Lead-Token",
    ],
  }),
);
app.options("/{*path}", cors());
// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Cookie parser for refresh token cookies
app.use(cookieParser());

// Body parsing with size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Remove X-Powered-By header
app.disable("x-powered-by");

// Enable gzip/brotli compression in production
if (process.env.NODE_ENV === "production") {
  app.use(compression());
}

// Health checks must not consume the general API rate-limit bucket.
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Apply general rate limiting to all API routes
app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/partners", partnersRoutes);
app.use("/api/leads", leadsRoutes); // Public leads endpoint for website forms
app.use("/api/documents", documentRoutes);

// Security headers for all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log error details for debugging (but not in response)
  console.error("Global error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Check for CORS errors
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({
      success: false,
      message: "Cross-origin request blocked",
    });
    return;
  }

  // Generic error response (don't leak internal details)
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Graceful shutdown handling
let server: ReturnType<typeof app.listen>;
let redisMemoryCheckInterval: ReturnType<typeof setInterval> | null = null;

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Close HTTP server first to stop accepting new requests
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    console.log("HTTP server closed.");
  } catch (err) {
    console.error("Error closing HTTP server:", err);
  }

  // Stop Redis memory check interval
  if (redisMemoryCheckInterval) clearInterval(redisMemoryCheckInterval);

  // Disconnect Redis
  if (isRedisAvailable()) {
    try {
      await disconnectRedis();
    } catch (err) {
      console.error("Error disconnecting Redis:", err);
    }
  }

  // Then disconnect Prisma
  try {
    await prisma.$disconnect();
    console.log("Prisma disconnected.");
  } catch (err) {
    console.error("Error disconnecting Prisma:", err);
  }

  // Destroy R2 client
  destroyR2Client();

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start server
const PORT = process.env.PORT || 5000;
server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔒 CORS origins: ${getAllowedOrigins().join(", ")}`);

  // Periodically check Redis memory usage and warn if > 80% of maxmemory.
  // The first run is triggered inside the Redis 'connect' event handler in
  // config/redis.ts so it only fires once the connection is confirmed ready.
  if (isRedisAvailable()) {
    redisMemoryCheckInterval = setInterval(
      () =>
        checkRedisMemory().catch((err) =>
          console.error("Redis memory check failed:", err),
        ),
      5 * 60 * 1_000,
    ); // every 5 min
  }
});

export default app;
