import { Request, Response, NextFunction } from 'express';

/**
 * Shared UUID v4 format regex.
 * Matches standard 8-4-4-4-12 hex format (case-insensitive).
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware that validates all route params whose name is 'id' or ends with 'Id'
 * against UUID v4 format. Returns 400 on mismatch, preventing Prisma 500 errors
 * on malformed IDs.
 */
export const validateUUID = (req: Request, res: Response, next: NextFunction): void => {
  for (const [paramName, paramValue] of Object.entries(req.params)) {
    const value = Array.isArray(paramValue) ? paramValue[0] : paramValue;
    if ((paramName === 'id' || paramName.endsWith('Id')) && (!value || !UUID_V4_REGEX.test(value))) {
      res.status(400).json({
        success: false,
        message: `Invalid ID format for "${paramName}"`,
      });
      return;
    }
  }
  next();
};

export const validateUUIDParam = (
  _req: Request,
  res: Response,
  next: NextFunction,
  value: string,
  paramName: string,
): void => {
  if ((paramName === 'id' || paramName.endsWith('Id')) && (!value || !UUID_V4_REGEX.test(value))) {
    res.status(400).json({
      success: false,
      message: `Invalid ID format for "${paramName}"`,
    });
    return;
  }

  next();
};
