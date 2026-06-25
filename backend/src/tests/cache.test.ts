import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const set = vi.fn();

vi.mock('../shared/config/redis.js', () => ({
  isRedisAvailable: () => true,
  getRedisClient: async () => ({ get, set }),
}));

const { cacheWrap } = await import('../shared/utils/cache.js');

describe('cacheWrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue(null);
    set.mockResolvedValue('OK');
  });

  it('coalesces concurrent cache misses for the same key', async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { value: 'fresh' };
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => cacheWrap('same-key', fetcher, 30))
    );

    expect(results).toEqual(Array.from({ length: 10 }, () => ({ value: 'fresh' })));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
