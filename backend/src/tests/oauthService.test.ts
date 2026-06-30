import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-minimum-32-characters';
process.env.FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || Buffer.alloc(32).toString('base64');

const oAuthAccountFindUnique = vi.fn();
const oAuthAccountCreate = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const txUserCreate = vi.fn();
const txOAuthCreate = vi.fn();
const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    user: { create: txUserCreate },
    oAuthAccount: { create: txOAuthCreate },
  })
);

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    oAuthAccount: {
      findUnique: oAuthAccountFindUnique,
      create: oAuthAccountCreate,
    },
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
    },
    $transaction: transaction,
  },
}));

const {
  buildGoogleAuthorizationUrl,
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getGoogleIdentityFromIdToken,
  resolveGooglePartnerUser,
  getPartnerOAuthSuccessRedirect,
  OAuthError,
} = await import('../modules/auth/oauth.service.js');

const baseUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'partner@gmail.com',
  password: 'hash',
  firstName: 'Partner',
  lastName: 'User',
  phone: null,
  role: 'partner' as const,
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: false,
  onboardingStatus: 'approved' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('oauth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    oAuthAccountFindUnique.mockResolvedValue(null);
    oAuthAccountCreate.mockResolvedValue({ user: baseUser });
    userFindUnique.mockResolvedValue(null);
    userUpdate.mockImplementation(async ({ data }: { data: object }) => ({ ...baseUser, ...data }));
    txUserCreate.mockResolvedValue({ ...baseUser, password: null, onboardingStatus: 'pending' });
    txOAuthCreate.mockResolvedValue({});
  });

  it('builds Google authorization URLs with state and PKCE S256', () => {
    const url = new URL(buildGoogleAuthorizationUrl({
      clientId: 'client-id',
      redirectUri: 'http://localhost:5000/api/auth/login/partner/google/callback',
      state: 'state-value',
      codeVerifier: 'verifier-value',
    }));

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(createPkceChallenge('verifier-value'));
  });

  it('generates unguessable state and verifier values', () => {
    expect(createOAuthState()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createPkceVerifier()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createOAuthState()).not.toBe(createOAuthState());
  });

  it('verifies Google ID token audience and verified email', () => {
    const identity = getGoogleIdentityFromIdToken({
      iss: 'https://accounts.google.com',
      aud: 'google-client-id',
      sub: 'google-sub',
      email: 'partner@gmail.com',
      email_verified: true,
      given_name: 'Partner',
      family_name: 'User',
    });

    expect(identity).toEqual(expect.objectContaining({
      sub: 'google-sub',
      email: 'partner@gmail.com',
    }));
  });

  it('rejects unverified Google email', () => {
    expect(() => getGoogleIdentityFromIdToken({
      iss: 'https://accounts.google.com',
      aud: 'google-client-id',
      sub: 'google-sub',
      email: 'partner@gmail.com',
      email_verified: false,
    })).toThrow(new OAuthError('OAUTH_EMAIL_UNVERIFIED'));
  });

  it('logs in an existing OAuth account and marks email verified', async () => {
    oAuthAccountFindUnique.mockResolvedValue({
      user: { ...baseUser, isEmailVerified: false },
    });

    const result = await resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@gmail.com',
      emailVerified: true,
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { isEmailVerified: true },
    });
    expect(result).toEqual({
      user: expect.objectContaining({ isEmailVerified: true }),
      isNewUser: false,
      accountAction: 'existing',
    });
  });

  it('rejects inactive existing OAuth accounts', async () => {
    oAuthAccountFindUnique.mockResolvedValue({
      user: { ...baseUser, isActive: false },
    });

    await expect(resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@gmail.com',
      emailVerified: true,
    })).rejects.toThrow(new OAuthError('OAUTH_ACCOUNT_DISABLED'));
  });

  it('does not silently link privileged users by email', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, role: 'admin' });

    await expect(resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'admin@gmail.com',
      emailVerified: true,
    })).rejects.toThrow(new OAuthError('ACCOUNT_LINK_REQUIRED'));
    expect(oAuthAccountCreate).not.toHaveBeenCalled();
  });

  it('does not auto-link non-authoritative partner emails', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, email: 'partner@example.com' });

    await expect(resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@example.com',
      emailVerified: true,
    })).rejects.toThrow(new OAuthError('ACCOUNT_LINK_REQUIRED'));
  });

  it('links existing gmail partner accounts idempotently', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, isEmailVerified: false });

    const result = await resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@gmail.com',
      emailVerified: true,
    });

    expect(oAuthAccountCreate).toHaveBeenCalledWith({
      data: {
        provider: 'google',
        providerUserId: 'google-sub',
        email: 'partner@gmail.com',
        userId: baseUser.id,
      },
      include: { user: true },
    });
    expect(result.isNewUser).toBe(false);
    expect(result.accountAction).toBe('linked');
  });

  it('creates new OAuth partner users without passwords and with pending onboarding', async () => {
    const result = await resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'newuser@gmail.com',
      emailVerified: true,
      givenName: 'New',
      familyName: 'User',
    });

    expect(txUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'newuser@gmail.com',
        password: null,
        role: 'partner',
        isActive: true,
        isEmailVerified: true,
        onboardingStatus: 'pending',
      }),
    });
    expect(txOAuthCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'google',
        providerUserId: 'google-sub',
      }),
    });
    expect(result.isNewUser).toBe(true);
    expect(result.accountAction).toBe('created');
  });

  it('recovers duplicate OAuth account creation by re-reading the existing binding', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser });
    oAuthAccountCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );
    oAuthAccountFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: baseUser.id,
      user: baseUser,
    });

    const result = await resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@gmail.com',
      emailVerified: true,
    });

    expect(result).toEqual({ user: baseUser, isNewUser: false, accountAction: 'existing' });
  });

  it('rejects duplicate OAuth bindings that point to another user', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser });
    oAuthAccountCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );
    oAuthAccountFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: '22222222-2222-4222-8222-222222222222',
      user: { ...baseUser, id: '22222222-2222-4222-8222-222222222222' },
    });

    await expect(resolveGooglePartnerUser({
      sub: 'google-sub',
      email: 'partner@gmail.com',
      emailVerified: true,
    })).rejects.toThrow(new OAuthError('OAUTH_PROVIDER_CONFLICT'));
  });

  it('redirects pending onboarding before dashboard role redirects', () => {
    expect(getPartnerOAuthSuccessRedirect({ ...baseUser, onboardingStatus: 'pending' }))
      .toBe('http://localhost:5173/onboarding?oauth=success');
    expect(getPartnerOAuthSuccessRedirect({ ...baseUser, onboardingStatus: 'approved' }))
      .toBe('http://localhost:5173/partner?oauth=success');
  });
});
