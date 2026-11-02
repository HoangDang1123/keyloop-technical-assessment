/**
 * Custom application error classes.
 * Each maps to a specific HTTP status code for the error handler middleware.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — request validation failed or business rule violated */
export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/** 404 — entity not found */
export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/** 409 — conflicting state (e.g., no available resources) */
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/** 422 — request is well-formed but semantically invalid */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, code = 'UNPROCESSABLE_ENTITY') {
    super(message, 422, code);
  }
}
