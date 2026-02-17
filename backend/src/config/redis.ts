/**
 * Shared Redis client singleton.
 *
 * Every module that needs Redis (token blacklist, rate limiter, OTP store,
 * cache layer) imports from here so we maintain a single connection pool.
 */

import { Redis } from 'ioredis';

let client: Redis | null = null;

/**
 * Returns the shared Redis instance.
 * Creates the connection lazily on first call.
 */
export const getRedisClient = (): Redis => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      'REDIS_URL environment variable is not set. ' +
        'Redis is required for caching, rate-limiting, OTP storage, and token blacklisting.'
    );
  }

  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('error', (err: Error) => {
    console.error('❌ Redis error:', err.message);
  });

  client.on('close', () => {
    console.log('⚠️  Redis connection closed');
  });

  client.connect().catch((err: Error) => {
    console.error('❌ Failed to connect to Redis:', err.message);
  });

  return client;
};

/**
 * Returns true when a Redis URL is configured and therefore Redis features
 * should be used instead of in-memory fallbacks.
 */
export const isRedisAvailable = (): boolean => !!process.env.REDIS_URL;

/**
 * Gracefully disconnect the shared Redis client.
 * Call this during application shutdown.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
    client = null;
    console.log('✅ Redis disconnected');
  }
};
