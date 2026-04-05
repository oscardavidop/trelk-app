import { ErrorCode, ERROR_I18N } from './error-codes';

/**
 * Base application error class.
 * All intentional errors in the system should use this.
 * The global exception filter serializes these to the standard API envelope.
 */
export class AppError extends Error {
  public readonly i18nKey: string;
  public readonly timestamp: number;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AppError';
    this.i18nKey = ERROR_I18N[code] ?? 'errors.unknown';
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      i18nKey: this.i18nKey,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,

    };
  }
}

/* ── Convenience factory functions ── */

export function unauthorized(code: ErrorCode = ErrorCode.UNAUTHORIZED, message = 'Unauthorized'): AppError {
  return new AppError(code, message, 401);
}

export function forbidden(code: ErrorCode = ErrorCode.ADMIN_ONLY, message = 'Forbidden'): AppError {
  return new AppError(code, message, 403);
}

export function notFound(code: ErrorCode = ErrorCode.NOT_FOUND, message = 'Not found'): AppError {
  return new AppError(code, message, 404);
}

export function badRequest(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
  return new AppError(code, message, 400, details);
}

export function conflict(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
  return new AppError(code, message, 409, details);
}

export function rateLimited(retryIn?: number): AppError {
  return new AppError(ErrorCode.RATE_LIMITED, 'Too many requests', 429, retryIn != null ? { retryIn } : undefined, true);
}

export function validationError(field: string, reason: string): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, `Validation failed: ${field}`, 400, { field, reason });
}
