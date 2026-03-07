/**
 * Token Blacklist for logout functionality.
 *
 * Uses the shared Redis client for all environments.
 */

import { getRedisClient } from '../config/redis.js';

interface BlacklistStorage {
  add(token: string, expiresAt: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

const PREFIX = 'token_blacklist:';

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

export const tokenBlacklist: BlacklistStorage = new RedisBlacklist();
