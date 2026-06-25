import { Request, Response, NextFunction } from 'express';
import type { User, UserRole } from '@prisma/client';
import prisma from '../db/prisma.js';
import { verifyAccessToken, extractTokenFromHeader } from '../security/jwt.js';
import { tokenBlacklist } from '../security/tokenBlacklist.js';
import {
  isAdminRole,
  userHasPermission,
  type PermissionAction,
  type PermissionResource,
} from '../../services/adminPermissions.js';

const AUTH_USER_CACHE_TTL_MS = Math.max(
  0,
  parseInt(process.env.AUTH_USER_CACHE_TTL_MS ?? '5000', 10) || 0
);
// ponytail: short auth cache; lower TTL or disable with 0 if instant user deactivation matters more than load.
const authUserCache = new Map<string, { user: User; expiresAt: number }>();

const getCachedAuthUser = (userId: string): User | null => {
  if (AUTH_USER_CACHE_TTL_MS <= 0) return null;

  const cached = authUserCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    authUserCache.delete(userId);
    return null;
  }
  return cached.user;
};

const setCachedAuthUser = (user: User): void => {
  if (AUTH_USER_CACHE_TTL_MS <= 0 || !user.isActive) return;
  authUserCache.set(user.id, { user, expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS });
};

declare global {
  namespace Express {
    interface Request {
      user?: User;
      partnerOrgId?: string;
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
      return;
    }

    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'TokenExpiredError' || err.message?.includes('expired')) {
        res.status(401).json({
          success: false,
          message: 'Token expired, please refresh or login again',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
      res.status(401).json({
        success: false,
        message: 'Not authorized, invalid subject',
      });
      return;
    }

    const user = getCachedAuthUser(payload.sub) ?? await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account has been deactivated',
      });
      return;
    }

    setCachedAuthUser(user);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
      return;
    }

    next();
  };
};

export const authorizeAdmin = authorize('super_admin', 'admin', 'manager', 'agent', 'viewer');
export const authorizeAdminOperator = authorize('super_admin', 'admin', 'manager', 'agent');

export const requirePermission = (resource: PermissionResource, action: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (!isAdminRole(req.user.role) || !(await userHasPermission(req.user.role, resource, action))) {
      res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to ${action} ${resource}`,
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      next();
      return;
    }

    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  } catch {
    next();
  }
};
