import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that attaches a unique request ID to each incoming request.
 * Reads from the X-Request-Id header if present, otherwise generates a UUID v4.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = requestId;
  next();
}

// Extend Express Request to include `id`
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
