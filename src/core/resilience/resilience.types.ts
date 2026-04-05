/**
 * Shared types for the resilience system.
 */

export type CircuitStateType = 'closed' | 'open' | 'half-open';

export interface CircuitSnapshot {
  service: string;
  state: CircuitStateType;
  failures: number;
  successes: number;
  lastFailure: number;
  lastSuccess: number;
  errorRate: number;
  avgLatencyMs: number;
  totalCalls: number;
}

export interface RetryOptions {
  /** Max retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in ms (default: 200) */
  baseDelayMs: number;
  /** Max delay in ms (default: 5000) */
  maxDelayMs: number;
  /** Jitter factor 0-1 (default: 0.2) */
  jitter: number;
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before opening (default: 5) */
  failureThreshold: number;
  /** Error rate 0-1 before opening (default: 0.5) */
  errorRateThreshold: number;
  /** Minimum calls before error rate matters (default: 10) */
  minCalls: number;
  /** Time in ms before half-open transition (default: 30000) */
  resetTimeoutMs: number;
  /** Max calls allowed in half-open state (default: 3) */
  halfOpenMaxCalls: number;
  /** Request timeout in ms (default: 10000) */
  requestTimeoutMs: number;
  /** Retry config */
  retry: RetryOptions;
}

export interface ProviderConfig<T = unknown> {
  name: string;
  execute: () => Promise<T>;
  /** Priority: lower = tried first (default: 0) */
  priority: number;
  /** Is this provider available? (optional health check) */
  isAvailable?: () => boolean | Promise<boolean>;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  jitter: 0.2,
};

export const DEFAULT_CB_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  errorRateThreshold: 0.5,
  minCalls: 10,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 3,
  requestTimeoutMs: 10_000,
  retry: DEFAULT_RETRY,
};
