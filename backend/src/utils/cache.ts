/**
 * Redis-backed caching layer.
 *
 * Provides get / set / invalidate helpers with automatic JSON
 * serialisation and TTL-based expiry.  Falls back to a no-op
 * implementation when Redis is not configured so the application
 * still works during local development without Redis.
 */

import { getRedisClient, isRedisAvailable } from '../config/redis.js';

const PREFIX = 'cache:';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

// ─── public API ─────────────────────────────────────────────

/**
 * Retrieve a cached value.  Returns `null` on miss.
 */
export const cacheGet = async <T = unknown>(key: string): Promise<T | null> => {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await getRedisClient().get(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.error('Cache GET error:', err);
    return null;
  }
};

/**
 * Store a value in the cache with an optional TTL (seconds).
 */
export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> => {
  if (!isRedisAvailable()) return;
  try {
    const serialised = JSON.stringify(value);
    await getRedisClient().set(`${PREFIX}${key}`, serialised, 'EX', ttlSeconds);
  } catch (err) {
    console.error('Cache SET error:', err);
  }
};

/**
 * Remove one or more keys from the cache.
 */
export const cacheDelete = async (...keys: string[]): Promise<void> => {
  if (!isRedisAvailable() || keys.length === 0) return;
  try {
    const redis = getRedisClient();
    await redis.del(...keys.map((k) => `${PREFIX}${k}`));
  } catch (err) {
    console.error('Cache DELETE error:', err);
  }
};

/**
 * Remove all keys that match a given pattern (e.g. `user:*`).
 * Uses SCAN under the hood to avoid blocking the server.
 */
export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
  if (!isRedisAvailable()) return;
  try {
    const redis = getRedisClient();
    const fullPattern = `${PREFIX}${pattern}`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Cache INVALIDATE error:', err);
  }
};

/**
 * Cache-aside helper.  Returns the cached value when available,
 * otherwise calls `fetcher`, stores the result, and returns it.
 */
export const cacheWrap = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> => {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
};
