import { describe, expect, it } from 'vitest';
import { envConfig } from '../shared/config/env.js';
import { isRedisAvailable } from '../shared/config/redis.js';
import { prisma } from '../shared/db/prisma.js';
import { sendOTP } from '../shared/integrations/msg91.service.js';
import { protect } from '../shared/middleware/auth.js';
import { encryptForGPSIndia } from '../shared/security/encryption.js';
import { signAccessToken } from '../shared/security/jwt.js';
import { destroyR2Client } from '../shared/storage/r2.js';
import { cacheWrap } from '../shared/utils/cache.js';

describe('shared backend structure', () => {
  it('exposes shared infrastructure from the target folders', () => {
    expect(envConfig).toBeDefined();
    expect(isRedisAvailable).toBeTypeOf('function');
    expect(destroyR2Client).toBeTypeOf('function');
    expect(prisma).toBeDefined();
    expect(protect).toBeTypeOf('function');
    expect(signAccessToken).toBeTypeOf('function');
    expect(encryptForGPSIndia).toBeTypeOf('function');
    expect(sendOTP).toBeTypeOf('function');
    expect(cacheWrap).toBeTypeOf('function');
  });
});
