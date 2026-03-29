import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';

export interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  lastSuccess: number;
}

const DEFAULT_THRESHOLD = 5;
const DEFAULT_RESET_MS = 30_000; // 30s
const DEFAULT_HALF_OPEN_MAX = 2;

/**
 * Circuit breaker distribuido (Redis-backed).
 * Protege llamadas a servicios externos (AI, GitHub, Sentry).
 * Si un servicio falla N veces, se "abre" el circuito y se usa fallback.
 */
@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly localState = new Map<string, CircuitState>();

  constructor(private readonly redis: RedisCacheService) {}

  async onModuleInit() {
    this.logger.log('Circuit breaker initialized');
  }

  async execute<T>(
    service: string,
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>,
    opts?: { threshold?: number; resetMs?: number },
  ): Promise<T> {
    const threshold = opts?.threshold ?? DEFAULT_THRESHOLD;
    const resetMs = opts?.resetMs ?? DEFAULT_RESET_MS;

    const state = await this.getState(service);

    if (state.state === 'open') {
      if (Date.now() - state.lastFailure > resetMs) {
        // Transition to half-open
        state.state = 'half-open';
        await this.setState(service, state);
      } else {
        this.logger.warn(`Circuit OPEN for ${service}, using fallback`);
        return fallback();
      }
    }

    try {
      const result = await fn();
      // Success: reset circuit
      if (state.state !== 'closed' || state.failures > 0) {
        state.failures = 0;
        state.state = 'closed';
        state.lastSuccess = Date.now();
        await this.setState(service, state);
      }
      return result;
    } catch (err) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= threshold) {
        state.state = 'open';
        this.logger.error(`Circuit OPENED for ${service} after ${state.failures} failures`);
      }

      await this.setState(service, state);
      this.logger.warn(`Circuit breaker: ${service} failed (${state.failures}/${threshold}), using fallback`);
      return fallback();
    }
  }

  async getState(service: string): Promise<CircuitState> {
    const key = `cb:${service}`;
    const cached = await this.redis.get<CircuitState>(key);
    if (cached) return cached;
    return { failures: 0, lastFailure: 0, state: 'closed', lastSuccess: Date.now() };
  }

  async getStatus(): Promise<Record<string, CircuitState>> {
    const services = ['ai', 'github', 'sentry', 'moderation', 'telegram'];
    const result: Record<string, CircuitState> = {};
    for (const svc of services) {
      result[svc] = await this.getState(svc);
    }
    return result;
  }

  private async setState(service: string, state: CircuitState): Promise<void> {
    await this.redis.set(`cb:${service}`, state, 300); // 5min TTL
  }
}
