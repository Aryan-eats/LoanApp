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
const inFlightFetches = new Map<string, Promise<unknown>>();

export interface CachedValue<T> {
  cached: true;
  value: T;
}

const wrapCachedValue = <T>(value: T): CachedValue<T> => ({
  cached: true,
  value,
});

const parseCachedValue = <T>(raw: string): CachedValue<T> => {
  const parsed = JSON.parse(raw) as unknown;

  if (
    parsed !== null
    && typeof parsed === 'object'
    && 'cached' in parsed
    && 'value' in parsed
    && (parsed as { cached?: unknown }).cached === true
  ) {
    return parsed as CachedValue<T>;
  }

  return wrapCachedValue(parsed as T);
};

// --- public API ---------------------------------------------

/**
 * Retrieve a cached value envelope. Returns `null` on miss.
 */
export const cacheGet = async <T = unknown>(key: string): Promise<CachedValue<T> | null> => {
  if (!isRedisAvailable()) return null;
  try {
    const redis = await getRedisClient();
    const raw = await redis.get(`${PREFIX}${key}`);
    return raw ? parseCachedValue<T>(raw) : null;
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
    const serialised = JSON.stringify(wrapCachedValue(value));
    const redis = await getRedisClient();
    await redis.set(`${PREFIX}${key}`, serialised, 'EX', ttlSeconds);
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
    const redis = await getRedisClient();
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
    const redis = await getRedisClient();
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
  if (cached?.cached) return cached.value;

  const inFlight = inFlightFetches.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const refresh = (async () => {
    const fresh = await fetcher();
    await cacheSet(key, fresh, ttlSeconds);
    return fresh;
  })();

  // ponytail: process-local single-flight; Redis lock only if multiple API replicas stampede.
  inFlightFetches.set(key, refresh);
  try {
    return await refresh;
  } finally {
    inFlightFetches.delete(key);
  }
};
