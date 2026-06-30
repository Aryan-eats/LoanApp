import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma, type User } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import { isAdminRole } from '../users/adminPermissions.service.js';

export type OAuthErrorCode =
  | 'OAUTH_INVALID_STATE'
  | 'OAUTH_PROVIDER_ERROR'
  | 'OAUTH_EMAIL_UNVERIFIED'
  | 'OAUTH_ACCOUNT_DISABLED'
  | 'ACCOUNT_LINK_REQUIRED'
  | 'OAUTH_CONFIGURATION_ERROR'
  | 'OAUTH_PROVIDER_CONFLICT';

export class OAuthError extends Error {
  constructor(public readonly code: OAuthErrorCode) {
    super(code);
    this.name = 'OAuthError';
  }
}

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'oauth_pkce_verifier';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type RawGoogleIdentity = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  email?: string;
  email_verified?: boolean | 'true' | 'false';
  given_name?: string;
  family_name?: string;
  name?: string;
  hd?: string;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: true;
  givenName?: string;
  familyName?: string;
  name?: string;
  hostedDomain?: string;
};

export type GoogleAuthorizationUrlInput = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
};

export type OAuthUserResult = {
  user: User;
  isNewUser: boolean;
  accountAction: 'existing' | 'linked' | 'created';
};

const base64url = (input: Buffer): string =>
  input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export const createOAuthState = (): string => base64url(crypto.randomBytes(32));

export const createPkceVerifier = (): string => base64url(crypto.randomBytes(32));

export const createPkceChallenge = (verifier: string): string =>
  base64url(crypto.createHash('sha256').update(verifier).digest());

export const buildGoogleAuthorizationUrl = ({
  clientId,
  redirectUri,
  state,
  codeVerifier,
}: GoogleAuthorizationUrlInput): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: createPkceChallenge(codeVerifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const expectedClientId = (): string => {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
    throw new OAuthError('OAUTH_CONFIGURATION_ERROR');
  }
  return process.env.GOOGLE_OAUTH_CLIENT_ID;
};

export const exchangeGoogleCodeForIdToken = async (
  code: string,
  codeVerifier: string
): Promise<string> => {
  if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new OAuthError('OAUTH_CONFIGURATION_ERROR');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: expectedClientId(),
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
    }),
  });

  const body = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !body.id_token) {
    throw new OAuthError('OAUTH_PROVIDER_ERROR');
  }

  return body.id_token;
};

export const getGoogleIdentityFromIdToken = (idToken: string | RawGoogleIdentity): GoogleIdentity => {
  const claims = typeof idToken === 'string'
    ? jwt.decode(idToken)
    : idToken;

  if (!claims || typeof claims !== 'object') {
    throw new OAuthError('OAUTH_PROVIDER_ERROR');
  }

  const raw = claims as RawGoogleIdentity;
  const aud = Array.isArray(raw.aud) ? raw.aud : [raw.aud];
  const verified = raw.email_verified === true || raw.email_verified === 'true';

  if (
    !['accounts.google.com', 'https://accounts.google.com'].includes(String(raw.iss))
    || !aud.includes(expectedClientId())
    || typeof raw.sub !== 'string'
    || typeof raw.email !== 'string'
  ) {
    throw new OAuthError('OAUTH_PROVIDER_ERROR');
  }

  if (!verified) {
    throw new OAuthError('OAUTH_EMAIL_UNVERIFIED');
  }

  return {
    sub: raw.sub,
    email: raw.email.toLowerCase(),
    emailVerified: true,
    givenName: raw.given_name,
    familyName: raw.family_name,
    name: raw.name,
    hostedDomain: raw.hd,
  };
};

const isAuthoritativeGoogleEmail = (identity: GoogleIdentity): boolean => {
  const domain = identity.email.split('@')[1]?.toLowerCase();
  if (domain === 'gmail.com') return true;
  return Boolean(identity.hostedDomain && domain && identity.hostedDomain.toLowerCase() === domain);
};

const splitName = (identity: GoogleIdentity): { firstName: string; lastName: string } => {
  if (identity.givenName?.trim()) {
    return {
      firstName: identity.givenName.trim(),
      lastName: identity.familyName?.trim() || '',
    };
  }

  const parts = (identity.name || identity.email).trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Google',
    lastName: parts.slice(1).join(' '),
  };
};

const isUniqueConstraint = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const verifiedUser = async (user: User): Promise<User> => {
  if (user.isEmailVerified) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true },
  });
};

const findOAuthAccount = (providerUserId: string) =>
  prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId,
      },
    },
    include: { user: true },
  });

const recoverDuplicateBinding = async (
  providerUserId: string,
  expectedUserId: string
): Promise<OAuthUserResult> => {
  const existing = await findOAuthAccount(providerUserId);
  if (!existing || existing.userId !== expectedUserId) {
    throw new OAuthError('OAUTH_PROVIDER_CONFLICT');
  }
  if (!existing.user.isActive) throw new OAuthError('OAUTH_ACCOUNT_DISABLED');
  return { user: await verifiedUser(existing.user), isNewUser: false, accountAction: 'existing' };
};

export const resolveGooglePartnerUser = async (
  identity: GoogleIdentity
): Promise<OAuthUserResult> => {
  const existingAccount = await findOAuthAccount(identity.sub);
  if (existingAccount) {
    if (!existingAccount.user.isActive) throw new OAuthError('OAUTH_ACCOUNT_DISABLED');
    return { user: await verifiedUser(existingAccount.user), isNewUser: false, accountAction: 'existing' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: identity.email } });
  if (existingUser) {
    if (!existingUser.isActive) throw new OAuthError('OAUTH_ACCOUNT_DISABLED');
    if (isAdminRole(existingUser.role) || !isAuthoritativeGoogleEmail(identity)) {
      throw new OAuthError('ACCOUNT_LINK_REQUIRED');
    }

    try {
      const account = await prisma.oAuthAccount.create({
        data: {
          provider: 'google',
          providerUserId: identity.sub,
          email: identity.email,
          userId: existingUser.id,
        },
        include: { user: true },
      });
      return { user: await verifiedUser(account.user), isNewUser: false, accountAction: 'linked' };
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return recoverDuplicateBinding(identity.sub, existingUser.id);
      }
      throw error;
    }
  }

  const { firstName, lastName } = splitName(identity);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: identity.email,
          password: null,
          firstName,
          lastName,
          role: 'partner',
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: false,
          onboardingStatus: 'pending',
          encryptionVersion: 1,
        },
      });

      await tx.oAuthAccount.create({
        data: {
          provider: 'google',
          providerUserId: identity.sub,
          email: identity.email,
          userId: created.id,
        },
      });

      return created;
    });

    return { user, isNewUser: true, accountAction: 'created' };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const existing = await findOAuthAccount(identity.sub);
      if (existing) {
        if (!existing.user.isActive) throw new OAuthError('OAUTH_ACCOUNT_DISABLED');
        return { user: await verifiedUser(existing.user), isNewUser: false, accountAction: 'existing' };
      }
    }
    throw error;
  }
};

const frontendUrl = (): string => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const getPartnerOAuthSuccessRedirect = (
  user: Pick<User, 'role' | 'onboardingStatus'>
): string => {
  if (user.role !== 'partner') {
    throw new OAuthError('OAUTH_PROVIDER_CONFLICT');
  }

  if (user.onboardingStatus !== 'approved') {
    return `${frontendUrl()}/onboarding?oauth=success`;
  }

  return `${frontendUrl()}/partner?oauth=success`;
};

export const publicOAuthFailureReason = (error: unknown): string => {
  if (!(error instanceof OAuthError)) return 'oauth_failed';
  switch (error.code) {
    case 'ACCOUNT_LINK_REQUIRED':
      return 'account_link_required';
    case 'OAUTH_ACCOUNT_DISABLED':
      return 'account_disabled';
    case 'OAUTH_CONFIGURATION_ERROR':
      return 'oauth_unavailable';
    default:
      return 'oauth_failed';
  }
};
