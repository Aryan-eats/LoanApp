import { Request, Response, NextFunction } from 'express';
import type { User, UserRole } from '@prisma/client';
import prisma from '../config/prisma.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';
import { tokenBlacklist } from '../utils/tokenBlacklist.js';

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

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
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
