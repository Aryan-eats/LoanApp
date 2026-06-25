import prisma from "./config/prisma.js";
import { destroyR2Client } from "./config/r2.js";
import {
  checkRedisMemory,
  disconnectRedis,
  isRedisAvailable,
} from "./config/redis.js";
import { validateJWTConfig } from "./utils/jwtValidator.js";

try {
  validateJWTConfig();
} catch (error) {
  console.error(
    "JWT Configuration Error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}

const { default: app, getAllowedOrigins } = await import("./app.js");

const port = process.env.PORT || 5000;
let redisMemoryCheckInterval: ReturnType<typeof setInterval> | null = null;

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`CORS origins: ${getAllowedOrigins().join(", ")}`);

  if (isRedisAvailable()) {
    redisMemoryCheckInterval = setInterval(
      () =>
        checkRedisMemory().catch((error) =>
          console.error("Redis memory check failed:", error),
        ),
      5 * 60 * 1_000,
    );
  }
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    console.log("HTTP server closed.");
  } catch (error) {
    console.error("Error closing HTTP server:", error);
  }

  if (redisMemoryCheckInterval) clearInterval(redisMemoryCheckInterval);

  if (isRedisAvailable()) {
    try {
      await disconnectRedis();
    } catch (error) {
      console.error("Error disconnecting Redis:", error);
    }
  }

  try {
    await prisma.$disconnect();
    console.log("Prisma disconnected.");
  } catch (error) {
    console.error("Error disconnecting Prisma:", error);
  }

  destroyR2Client();
  process.exit(0);
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
