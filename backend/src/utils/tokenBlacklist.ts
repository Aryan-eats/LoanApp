/**
 * Token Blacklist for logout functionality.
 *
 * Uses the shared Redis client when REDIS_URL is set, otherwise
 * falls back to an in-memory store (development only).
 */

import { getRedisClient, isRedisAvailable } from '../config/redis.js';

interface BlacklistStorage {
  add(token: string, expiresAt: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

const PREFIX = 'token_blacklist:';

// --- In-memory fallback ------------------------------------

class InMemoryBlacklist implements BlacklistStorage {
  private blacklist: Map<string, number> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000);
    this.cleanupInterval.unref?.();
    console.log('⚠️  Using in-memory token blacklist (development only)');
  }

  async add(token: string, expiresAt: number): Promise<void> {
    this.blacklist.set(token, expiresAt);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return this.blacklist.has(token);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (expiresAt < now) this.blacklist.delete(token);
    }
  }

  async size(): Promise<number> {
    return this.blacklist.size;
  }

  async clear(): Promise<void> {
    this.blacklist.clear();
  }
}

// --- Redis-backed blacklist --------------------------------

class RedisBlacklist implements BlacklistStorage {
  async add(token: string, expiresAt: number): Promise<void> {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      const redis = await getRedisClient();
      await redis.set(`${PREFIX}${token}`, '1', 'EX', ttl);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const redis = await getRedisClient();
    const result = await redis.exists(`${PREFIX}${token}`);
    return result === 1;
  }

  async size(): Promise<number> {
    let count = 0;
    let cursor = '0';
    const redis = await getRedisClient();
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', 100);
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');
    return count;
  }

  async clear(): Promise<void> {
    const redis = await getRedisClient();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}

// --- Factory & singleton -----------------------------------

const createTokenBlacklist = (): BlacklistStorage => {
  if (isRedisAvailable()) {
    return new RedisBlacklist();
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  SECURITY WARNING: No REDIS_URL configured in production!');
    console.warn('⚠️  Token blacklist will not persist across server restarts.');
  }

  return new InMemoryBlacklist();
};

export const tokenBlacklist = createTokenBlacklist();
