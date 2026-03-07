import { Request, Response, NextFunction } from 'express';

/**
 * Returns Express middleware that sets `Cache-Control: public, max-age=<seconds>`
 * on the response. Intended for static-ish reference data (banks, doc-type lists)
 * that changes infrequently.
 *
 * The header is set eagerly; upstream CDN / browser caches will only honour it
 * when paired with a 2xx status, so error responses are not cached in practice.
 */
export const cacheControl = (maxAgeSeconds: number) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
    next();
  };
