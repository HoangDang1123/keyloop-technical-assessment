import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

/**
 * Global error-handling middleware.
 * Converts known error types to structured JSON responses.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.id;

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    logger.warn({ requestId, validationErrors: details }, 'Validation error');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unexpected errors → 500
  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
