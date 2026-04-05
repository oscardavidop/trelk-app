import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';
import {
  CircuitBreakerOptions,
  CircuitSnapshot,
  CircuitStateType,
  DEFAULT_CB_OPTIONS,
  RetryOptions,
} from './resilience.types';

interface InternalState {
  state: CircuitStateType;
  failures: number;
  successes: number;
  lastFailure: number;
  lastSuccess: number;
  halfOpenCalls: number;
  // Rolling window for error rate
  recentCalls: number;
  recentErrors: number;
  latencySum: number;
  latencyCount: number;
}

const EMPTY_STATE: InternalState = {
  state: 'closed',
  failures: 0,
  successes: 0,
  lastFailure: 0,
  lastSuccess: 0,
  halfOpenCalls: 0,
  recentCalls: 0,
  recentErrors: 0,
  latencySum: 0,
  latencyCount: 0,
};

/**
 * Circuit Breaker v2 — production-grade resilience.
 *
 * Features:
 * - Three states: CLOSED → OPEN → HALF-OPEN → CLOSED
 * - Error rate + consecutive failure thresholds
 * - Exponential backoff retry with jitter
 * - Per-request timeout
 * - Rolling window metrics (error rate, latency)
 * - Redis-backed distributed state
 * - Structured logging
 */
@Injectable()
export class CircuitBreakerV2Service {
  private readonly logger = new Logger('CircuitBreaker');
  private readonly configs = new Map<string, CircuitBreakerOptions>();
  private readonly localCache = new Map<string, InternalState>();

  constructor(private readonly redis: RedisCacheService) {}

  /**
   * Register service-specific circuit breaker config.
   */
  configure(service: string, opts: Partial<CircuitBreakerOptions>): void {
    this.configs.set(service, { ...DEFAULT_CB_OPTIONS, ...opts, retry: { ...DEFAULT_CB_OPTIONS.retry, ...opts.retry } });
  }

  /**
   * Execute a function through the circuit breaker.
   * Returns result from fn, or from fallback if circuit is open / fn fails after retries.
   */
  async execute<T>(
    service: string,
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    const opts = this.configs.get(service) ?? DEFAULT_CB_OPTIONS;
    const state = await this.loadState(service);

    // ── Check circuit state ──
    if (state.state === 'open') {
      if (Date.now() - state.lastFailure > opts.resetTimeoutMs) {
        state.state = 'half-open';
        state.halfOpenCalls = 0;
        await this.saveState(service, state);
        this.logger.log({ msg: 'circuit-half-open', service });
      } else {
        this.logger.warn({ msg: 'circuit-open-fallback', service });
        return fallback();
      }
    }

    if (state.state === 'half-open' && state.halfOpenCalls >= opts.halfOpenMaxCalls) {
      this.logger.warn({ msg: 'half-open-max-reached', service });
      return fallback();
    }

    // ── Try with retries ──
    const start = Date.now();
    try {
      const result = await this.executeWithRetry(fn, opts.retry, opts.requestTimeoutMs);
      const elapsed = Date.now() - start;

      // Success path
      state.successes++;
      state.lastSuccess = Date.now();
      state.recentCalls++;
      state.latencySum += elapsed;
      state.latencyCount++;

      if (state.state === 'half-open') {
        state.halfOpenCalls++;
        if (state.halfOpenCalls >= opts.halfOpenMaxCalls) {
          // Fully recovered
          state.state = 'closed';
          state.failures = 0;
          state.recentErrors = 0;
          this.logger.log({ msg: 'circuit-closed-recovered', service, latencyMs: elapsed });
        }
      } else if (state.failures > 0) {
        // Reset consecutive failures on success
        state.failures = 0;
      }

      await this.saveState(service, state);
      return result;
    } catch (err) {
      const elapsed = Date.now() - start;

      // Failure path
      state.failures++;
      state.lastFailure = Date.now();
      state.recentCalls++;
      state.recentErrors++;
      state.latencySum += elapsed;
      state.latencyCount++;

      const errorRate = state.recentCalls >= opts.minCalls
        ? state.recentErrors / state.recentCalls
        : 0;

      const shouldOpen =
        state.failures >= opts.failureThreshold ||
        (state.recentCalls >= opts.minCalls && errorRate >= opts.errorRateThreshold);

      if (state.state === 'half-open') {
        // Half-open failure → reopen
        state.state = 'open';
        this.logger.error({
          msg: 'circuit-reopened',
          service,
          error: (err as Error).message,
        });
      } else if (shouldOpen) {
        state.state = 'open';
        this.logger.error({
          msg: 'circuit-opened',
          service,
          failures: state.failures,
          errorRate: Math.round(errorRate * 100),
        });
      } else {
        this.logger.warn({
          msg: 'call-failed',
          service,
          failures: state.failures,
          threshold: opts.failureThreshold,
          error: (err as Error).message,
        });
      }

      await this.saveState(service, state);
      return fallback();
    }
  }

  /**
   * Execute with provider chain — tries providers in priority order,
   * each protected by its own circuit breaker.
   */
  async executeChain<T>(
    providers: Array<{ name: string; execute: () => Promise<T>; isAvailable?: () => boolean | Promise<boolean> }>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    for (const provider of providers) {
      if (provider.isAvailable) {
        const available = await provider.isAvailable();
        if (!available) continue;
      }

      const state = await this.loadState(provider.name);
      if (state.state === 'open' && Date.now() - state.lastFailure < (this.configs.get(provider.name)?.resetTimeoutMs ?? 30_000)) {
        continue; // Skip open circuits
      }

      try {
        return await this.execute(provider.name, provider.execute, () => {
          throw new Error(`provider-${provider.name}-failed`);
        });
      } catch {
        continue; // Try next provider
      }
    }

    this.logger.error({ msg: 'all-providers-failed', providers: providers.map(p => p.name) });
    return fallback();
  }

  /**
   * Get snapshot of all circuit states.
   */
  async getSnapshots(services: string[]): Promise<CircuitSnapshot[]> {
    const snapshots: CircuitSnapshot[] = [];
    for (const service of services) {
      const state = await this.loadState(service);
      const errorRate = state.recentCalls > 0
        ? state.recentErrors / state.recentCalls
        : 0;
      const avgLatency = state.latencyCount > 0
        ? Math.round(state.latencySum / state.latencyCount)
        : 0;

      snapshots.push({
        service,
        state: state.state,
        failures: state.failures,
        successes: state.successes,
        lastFailure: state.lastFailure,
        lastSuccess: state.lastSuccess,
        errorRate: Math.round(errorRate * 100) / 100,
        avgLatencyMs: avgLatency,
        totalCalls: state.recentCalls,
      });
    }
    return snapshots;
  }

  /**
   * Force-reset a circuit to closed state.
   */
  async resetCircuit(service: string): Promise<void> {
    await this.saveState(service, { ...EMPTY_STATE });
    this.logger.log({ msg: 'circuit-force-reset', service });
  }

  // ── Internal helpers ──

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retry: RetryOptions,
    timeoutMs: number,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
      try {
        return await this.withTimeout(fn(), timeoutMs);
      } catch (err) {
        lastError = err as Error;
        if (attempt < retry.maxRetries) {
          const delay = this.computeBackoff(attempt, retry);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private computeBackoff(attempt: number, opts: RetryOptions): number {
    const exponential = Math.min(opts.baseDelayMs * 2 ** attempt, opts.maxDelayMs);
    const jitter = exponential * opts.jitter * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(exponential + jitter));
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise
        .then((val) => { clearTimeout(timer); resolve(val); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async loadState(service: string): Promise<InternalState> {
    // Check local cache first
    const local = this.localCache.get(service);
    if (local) return { ...local };

    const key = `cbv2:${service}`;
    const cached = await this.redis.get<InternalState>(key);
    if (cached) {
      this.localCache.set(service, cached);
      return { ...cached };
    }
    return { ...EMPTY_STATE };
  }

  private async saveState(service: string, state: InternalState): Promise<void> {
    this.localCache.set(service, state);
    await this.redis.set(`cbv2:${service}`, state, 600); // 10min TTL
  }
}
