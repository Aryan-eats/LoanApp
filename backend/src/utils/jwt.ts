import jwt, { JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { User, UserRole } from '@prisma/client';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: 'refresh';
}

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured. A distinct refresh secret is required.');
  }
  return secret;
};

const accessExpiresIn: SignOptions['expiresIn'] =
  (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const refreshExpiresIn: SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export const signAccessToken = (user: User): string => {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, getAccessSecret(), { expiresIn: accessExpiresIn });
};

export const signRefreshToken = (user: User): string => {
  const payload: RefreshTokenPayload = {
    sub: user.id,
    type: 'refresh',
  };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: refreshExpiresIn });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
};

export const getTokenExpirationMs = (token: string): number | null => {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded || !decoded.exp) {
    return null;
  }
  return decoded.exp * 1000;
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

export const parseExpiresInToSeconds = (value: string): number => {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return 0;
  }
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return 0;
  }
};

export const getAccessTokenTtlSeconds = (): number => {
  return parseExpiresInToSeconds(String(accessExpiresIn));
};
