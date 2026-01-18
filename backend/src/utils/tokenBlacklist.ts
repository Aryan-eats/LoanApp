/**
 * Token Blacklist for logout functionality.
 * 
 * Uses Redis for production (distributed cache for multiple server instances).
 * Falls back to in-memory storage for development.
 */

import { Redis } from 'ioredis';

interface BlacklistStorage {
  add(token: string, expiresAt: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
  size(): Promise<number>;
  destroy(): Promise<void>;
}

// In-memory fallback for development
class InMemoryBlacklist implements BlacklistStorage {
  private blacklist: Map<string, number> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000);
    console.log('⚠️ Using in-memory token blacklist (development only)');
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
      if (expiresAt < now) {
        this.blacklist.delete(token);
      }
    }
  }

  async size(): Promise<number> {
    return this.blacklist.size;
  }

  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.blacklist.clear();
  }
}

// Redis-based blacklist for production
class RedisBlacklist implements BlacklistStorage {
  private redis: Redis;
  private prefix = 'token_blacklist:';

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis token blacklist connected');
    });

    this.redis.on('error', (err: Error) => {
      console.error('❌ Redis connection error:', err.message);
    });

    this.redis.connect().catch((err: Error) => {
      console.error('❌ Failed to connect to Redis:', err.message);
    });
  }

  async add(token: string, expiresAt: number): Promise<void> {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.set(`${this.prefix}${token}`, '1', 'EX', ttl);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.exists(`${this.prefix}${token}`);
    return result === 1;
  }

  async size(): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    return keys.length;
  }

  async destroy(): Promise<void> {
    await this.redis.quit();
  }
}

// Factory function to create appropriate blacklist
const createTokenBlacklist = (): BlacklistStorage => {
  const redisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (redisUrl) {
    return new RedisBlacklist(redisUrl);
  }

  if (isProduction) {
    console.warn('⚠️ SECURITY WARNING: No REDIS_URL configured in production!');
    console.warn('⚠️ Token blacklist will not persist across server restarts.');
  }

  return new InMemoryBlacklist();
};

// Export singleton instance
export const tokenBlacklist = createTokenBlacklist();
