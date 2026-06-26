import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { apiLimiter } from "./shared/middleware/rateLimiter.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import documentRoutes from "./modules/documents/document.routes.js";
import leadsRoutes from "./modules/leads/publicLead.routes.js";
import partnerRoutes from "./modules/partners/partner.routes.js";
import partnersRoutes from "./modules/partners/partners.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import softCheckRoutes from "./modules/soft-check/softCheck.routes.js";

export const getAllowedOrigins = (): string[] => {
  const origins =
    process.env.ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";
  return origins.split(",").map((origin) => origin.trim());
};

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
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

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.use(compression());
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/partner/soft-check", softCheckRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/partners", partnersRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/documents", documentRoutes);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Global error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  if (err.message === "Not allowed by CORS") {
    res.status(403).json({
      success: false,
      message: "Cross-origin request blocked",
    });
    return;
  }

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

export default app;
