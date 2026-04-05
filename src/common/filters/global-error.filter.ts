import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { join } from 'path';
import { AppError } from '../errors/app-error';
import { ErrorCode, ERROR_I18N } from '../errors/error-codes';

/**
 * Catches ALL exceptions and normalizes them to the standard error envelope:
 *
 * {
 *   ok: false,
 *   error: { code, message, i18nKey, details, retryable, timestamp }
 * }
 *
 * Also handles SPA fallback for non-API 404 routes.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const res = ctx.getResponse<FastifyReply>();
    const url = req.url;

    // ── SPA fallback for non-API 404s ──
    if (exception instanceof HttpException && exception.getStatus() === 404) {
      if (!url.startsWith('/api/') && !url.startsWith('/users/api') && !url.startsWith('/health')) {
        return res.sendFile('index.html', join(process.cwd(), 'frontend/dist'));
      }
    }

    const envelope = this.buildEnvelope(exception);

    // Log server errors, not client errors
    if (envelope.statusCode >= 500) {
      this.logger.error(
        `[${envelope.error.code}] ${req.method} ${url} → ${envelope.statusCode}: ${envelope.error.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    return res.status(envelope.statusCode).send({
      ok: false,
      error: envelope.error,
    });
  }

  private buildEnvelope(exception: unknown): {
    statusCode: number;
    error: {
      code: string;
      message: string;
      i18nKey: string;
      details?: Record<string, unknown>;
      retryable: boolean;
      timestamp: number;
    };
  } {
    const timestamp = Date.now();

    // 1) Our own AppError — already structured
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        error: exception.toJSON(),
      };
    }

    // 2) NestJS HttpException (guards, pipes, legacy throws)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const { code, message, i18nKey, details, retryable } = this.parseHttpException(response, status);

      return {
        statusCode: status,
        error: { code, message, i18nKey, details, retryable, timestamp },
      };
    }

    // 3) Unknown / unhandled errors — never expose internals
    return {
      statusCode: 500,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Internal server error',
        i18nKey: ERROR_I18N[ErrorCode.UNKNOWN_ERROR],
        retryable: true,
        timestamp,
      },
    };
  }

  /**
   * Parse the response body of a NestJS HttpException to extract
   * a structured error. Handles strings, objects, and class-validator arrays.
   */
  private parseHttpException(
    response: string | object,
    status: number,
  ): {
    code: string;
    message: string;
    i18nKey: string;
    details?: Record<string, unknown>;
    retryable: boolean;
  } {
    // String message
    if (typeof response === 'string') {
      const code = this.inferCodeFromStatus(status, response);
      return {
        code,
        message: this.sanitizeMessage(response),
        i18nKey: ERROR_I18N[code as ErrorCode] ?? 'errors.unknown',
        retryable: status === 429 || status >= 500,
      };
    }

    const body = response as Record<string, any>;

    // Already has our `code` field (e.g. from guards using AppError-style objects)
    if (body.code && typeof body.code === 'string') {
      const code = body.code as ErrorCode;
      return {
        code,
        message: body.message || 'Error',
        i18nKey: body.i18nKey || ERROR_I18N[code] || 'errors.unknown',
        details: body.details,
        retryable: body.retryable ?? (status === 429 || status >= 500),
      };
    }

    // Legacy format: { error: string, message: string, ... }
    if (body.error_key || body.error_code) {
      const legacyCode = (body.error_key || body.error_code) as string;
      const code = this.mapLegacyCode(legacyCode) || this.inferCodeFromStatus(status);
      return {
        code,
        message: body.message || body.error || 'Error',
        i18nKey: ERROR_I18N[code as ErrorCode] ?? 'errors.unknown',
        details: body.details,
        retryable: body.retryable ?? (status === 429 || status >= 500),
      };
    }

    // NestJS validation pipe errors: { message: string[], error: string, statusCode: number }
    if (Array.isArray(body.message)) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: body.message[0] || 'Validation failed',
        i18nKey: ERROR_I18N[ErrorCode.VALIDATION_ERROR],
        details: { fields: body.message },
        retryable: false,
      };
    }

    // Generic NestJS HttpException
    const msg = body.message || body.error || 'Error';
    const code = this.inferCodeFromStatus(status, msg);
    return {
      code,
      message: this.sanitizeMessage(msg),
      i18nKey: ERROR_I18N[code as ErrorCode] ?? 'errors.unknown',
      details: body.details,
      retryable: status === 429 || status >= 500,
    };
  }

  /** Infer an ErrorCode from HTTP status + optional message hint */
  private inferCodeFromStatus(status: number, hint?: string): ErrorCode {
    if (hint) {
      // Check if the hint itself is already an ErrorCode enum value
      if (Object.values(ErrorCode).includes(hint as ErrorCode)) {
        return hint as ErrorCode;
      }
      // Map common legacy string hints
      const mapped = this.mapLegacyCode(hint);
      if (mapped) return mapped;
    }

    switch (status) {
      case 400: return ErrorCode.VALIDATION_ERROR;
      case 401: return ErrorCode.UNAUTHORIZED;
      case 403: return ErrorCode.ADMIN_ONLY;
      case 404: return ErrorCode.NOT_FOUND;
      case 409: return ErrorCode.REVIEW_EDIT_PENDING;
      case 429: return ErrorCode.RATE_LIMITED;
      default:  return ErrorCode.UNKNOWN_ERROR;
    }
  }

  /** Map known legacy error strings to ErrorCode */
  private mapLegacyCode(legacy: string): ErrorCode | null {
    const map: Record<string, ErrorCode> = {
      // Auth
      'expired-session': ErrorCode.SESSION_EXPIRED,
      'expired-session-view': ErrorCode.SESSION_EXPIRED,
      'INIT_DATA_NOT_PROVIDED': ErrorCode.INIT_DATA_MISSING,
      'INIT_DATA_MISSING': ErrorCode.INIT_DATA_MISSING,
      'INIT_DATA_HASH_MISSING': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_AUTH_DATE_MISSING': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_AUTH_DATE_INVALID': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_EXPIRED': ErrorCode.INIT_DATA_EXPIRED,
      'INIT_DATA_AUTH_DATE_FUTURE': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_SIGNATURE_INVALID': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_USER_MISSING': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_USER_PARSE_ERROR': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_USER_ID_INVALID': ErrorCode.INIT_DATA_INVALID,
      'INIT_DATA_USER_NAME_MISSING': ErrorCode.INIT_DATA_INVALID,
      'TOKEN_EXPIRED': ErrorCode.TOKEN_EXPIRED,
      'TOKEN_INVALID': ErrorCode.TOKEN_INVALID,
      'TOKEN_VERIFICATION_FAILED': ErrorCode.TOKEN_INVALID,
      'TOKEN_REVOKED': ErrorCode.TOKEN_REVOKED,
      'TOKEN_NOT_FOUND': ErrorCode.TOKEN_REVOKED,
      'USER_NOT_FOUND': ErrorCode.USER_NOT_FOUND,
      // Security
      'PIN_INCORRECT': ErrorCode.PIN_INCORRECT,
      'PIN_INVALID_FORMAT': ErrorCode.PIN_INVALID_FORMAT,
      'ACCOUNT_LOCKED': ErrorCode.ACCOUNT_LOCKED,
      'RECOVERY_LOCKED': ErrorCode.RECOVERY_LOCKED,
      'RECOVERY_NOT_VERIFIED': ErrorCode.RECOVERY_NOT_VERIFIED,
      // Reviews
      'reviews_error_edit_pending': ErrorCode.REVIEW_EDIT_PENDING,
      // Rate limit
      'rate_limited': ErrorCode.RATE_LIMITED,
      // Admin
      'admin_only': ErrorCode.ADMIN_ONLY,
      'Admin only': ErrorCode.ADMIN_ONLY,
    };
    return map[legacy] ?? null;
  }

  /** Strip potentially dangerous info from error messages */
  private sanitizeMessage(msg: string): string {
    // Don't expose stack traces, file paths, or DB details
    if (msg.includes('at ') && msg.includes('/')) return 'Internal error';
    if (msg.toLowerCase().includes('mongo')) return 'Internal error';
    if (msg.toLowerCase().includes('econnrefused')) return 'Service temporarily unavailable';
    return msg;
  }
}
