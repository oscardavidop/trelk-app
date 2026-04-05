/**
 * Typed API error that mirrors the backend error envelope.
 * Every error from the API goes through this class.
 */
export interface ApiErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    i18nKey?: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    timestamp?: string;
  };
}

export class ApiError extends Error {
  /** Machine-readable error code (e.g. 'RATE_LIMITED', 'SESSION_EXPIRED') */
  readonly code: string;
  /** HTTP status code */
  readonly statusCode: number;
  /** i18n translation key for localized display */
  readonly i18nKey: string | undefined;
  /** Extra details (validation errors, retryIn seconds, etc.) */
  readonly details: Record<string, unknown> | undefined;
  /** Whether the operation can be retried */
  readonly retryable: boolean;
  /** Server timestamp */
  readonly timestamp: string | undefined;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    i18nKey?: string,
    details?: Record<string, unknown>,
    retryable = false,
    timestamp?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.i18nKey = i18nKey;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = timestamp;
  }

  /** True if this is an auth error that should trigger session refresh / logout */
  get isAuthError(): boolean {
    return this.statusCode === 401 || this.code === 'SESSION_EXPIRED' || this.code === 'TOKEN_EXPIRED' || this.code === 'TOKEN_REVOKED';
  }

  /** True if this is a rate-limit error */
  get isRateLimited(): boolean {
    return this.statusCode === 429 || this.code === 'RATE_LIMITED';
  }

  /** Seconds to wait before retrying (from details.retryIn) */
  get retryAfter(): number | undefined {
    return typeof this.details?.retryIn === 'number' ? this.details.retryIn : undefined;
  }

  /**
   * Parse a fetch Response into an ApiError.
   * Handles both the new structured envelope and legacy formats.
   */
  static async fromResponse(res: Response): Promise<ApiError> {
    let body: any;
    try {
      body = await res.json();
    } catch {
      return new ApiError(
        'UNKNOWN_ERROR',
        res.statusText || `HTTP ${res.status}`,
        res.status,
      );
    }

    // New structured envelope: { ok: false, error: { code, message, ... } }
    if (body?.error?.code) {
      const e = body.error;
      return new ApiError(
        e.code,
        e.message || res.statusText,
        res.status,
        e.i18nKey,
        e.details,
        e.retryable ?? false,
        e.timestamp,
      );
    }

    // Legacy: { error: string, message?: string }
    if (typeof body?.error === 'string') {
      return new ApiError(
        body.error,
        body.message || body.error,
        res.status,
      );
    }

    // Legacy: { message: string, error_key?: string }
    if (body?.message) {
      return new ApiError(
        body.error_key || body.error_code || 'UNKNOWN_ERROR',
        body.message,
        body.statusCode || res.status,
      );
    }

    // Fallback
    return new ApiError(
      'UNKNOWN_ERROR',
      typeof body === 'string' ? body : res.statusText || `HTTP ${res.status}`,
      res.status,
    );
  }
}

/** Type guard: check if an unknown error is an ApiError */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
