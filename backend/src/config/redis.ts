/**
 * Shared Redis client singleton.
 *
 * Every module that needs Redis (token blacklist, rate limiter, OTP store,
 * cache layer) imports from here so we maintain a single connection pool.
 */

import { Redis } from 'ioredis';

let client: Redis | null = null;
let connectPromise: Promise<Redis> | null = null;
let redisRetryAfter = 0;
let availabilityWarningLogged = false;

const REDIS_RETRY_COOLDOWN_MS = 30_000;

const isRetryCooldownActive = (): boolean => Date.now() < redisRetryAfter;

const clearClientReference = (instance: Redis): void => {
  if (client === instance) {
    client = null;
  }
};

const markRedisUnavailable = (reason: string, err?: Error): void => {
  redisRetryAfter = Date.now() + REDIS_RETRY_COOLDOWN_MS;

  if (!availabilityWarningLogged) {
    const details = err?.message ? ` (${err.message})` : '';
    console.warn(
      `Redis unavailable for ${REDIS_RETRY_COOLDOWN_MS / 1000}s after ${reason}${details}. ` +
        'Falling back where supported.'
    );
    availabilityWarningLogged = true;
  }
};

/**
 * Returns the shared Redis instance.
 * Creates the connection lazily on first call.
 */
export const getRedisClient = async (): Promise<Redis> => {
  if (client?.status === 'ready') return client;
  if (connectPromise) return connectPromise;
  if (isRetryCooldownActive()) {
    throw new Error('Redis is temporarily unavailable.');
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      'REDIS_URL environment variable is not set. ' +
        'Redis is required for caching, rate-limiting, OTP storage, and token blacklisting.'
    );
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 5_000, // fail fast if Redis is unreachable
    // commandTimeout is intentionally omitted: setting it causes queued commands
    // that are waiting for the connection to be established (offline queue) to be
    // rejected with "Command timed out" before the connection completes. The
    // connectTimeout above already handles the case where Redis is never reachable.
    retryStrategy(times) {
      if (times > 10) return null; // stop retrying after 10 attempts
      return Math.min(times * 200, 5_000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  client = redis;

  redis.on('ready', () => {
    redisRetryAfter = 0;
    availabilityWarningLogged = false;
    console.log('Redis connected');
    // Run the memory check only after the connection is confirmed ready so the
    // INFO command is never queued into the offline buffer.
    checkRedisMemory().catch((err) =>
      console.error('Redis memory check failed at startup:', err)
    );
  });

  redis.on('error', (err: Error) => {
    console.error('Redis error:', err.message || err);
  });

  redis.on('close', () => {
    clearClientReference(redis);
    markRedisUnavailable('connection close');
    console.warn('Redis connection closed');
  });

  redis.on('end', () => {
    clearClientReference(redis);
  });

  connectPromise = redis
    .connect()
    .then(() => redis)
    .catch((err: Error) => {
      clearClientReference(redis);
      markRedisUnavailable('connection failure', err);
      redis.disconnect();
      throw err;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
};

/**
 * Returns true when a Redis URL is configured and the client is not in a
 * temporary cooldown after a connection failure.
 */
export const isRedisAvailable = (): boolean =>
  !!process.env.REDIS_URL && !isRetryCooldownActive();

/**
 * Checks Redis memory usage and logs a warning when used memory exceeds 80%
 * of the configured maxmemory limit. Call this from a periodic health-check
 * or startup routine.
 *
 * maxmemory-policy is set to volatile-lru in redis.conf, so only keys with a
 * TTL are eligible for eviction. This check gives early warning before the
 * eviction pressure reaches security-critical keys (token blacklist).
 */
export const checkRedisMemory = async (): Promise<void> => {
  if (!isRedisAvailable()) return;

  try {
    const redis = await getRedisClient();
    const info = await redis.info('memory');
    const usedMatch = info.match(/used_memory:(\d+)/);
    const maxMatch = info.match(/maxmemory:(\d+)/);
    if (!usedMatch || !maxMatch) return;

    const used = parseInt(usedMatch[1], 10);
    const max = parseInt(maxMatch[1], 10);
    if (max > 0 && used / max > 0.8) {
      const pct = ((used / max) * 100).toFixed(1);
      console.warn(
        `Redis memory usage at ${pct}% (${used} / ${max} bytes). ` +
          'Eviction of volatile keys (including token blacklist) may begin soon. ' +
          'Consider increasing REDIS_MAXMEMORY or pruning cache keys.'
      );
    }
  } catch (err) {
    // Non-fatal: memory check failure should not affect request handling.
    console.error('Redis memory check failed:', err);
  }
};

/**
 * Gracefully disconnect the shared Redis client.
 * Call this during application shutdown.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (connectPromise) {
    try {
      await connectPromise;
    } catch {
      // Ignore startup failures during teardown.
    }
  }

  if (client) {
    if (client.status === 'ready') {
      await client.quit();
    } else {
      client.disconnect();
    }

    client = null;
    connectPromise = null;
    console.log('Redis disconnected');
  }
};
