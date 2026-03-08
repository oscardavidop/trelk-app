import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Servicio de caché Redis con fallback graceful.
 * Si Redis no está disponible, las operaciones retornan null sin errores.
 * Ideal para sesiones, caché de templates, y rate limiting custom.
 */
@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('REDIS_ENABLED', false);
    if (!enabled) {
      this.logger.warn('Redis deshabilitado (REDIS_ENABLED=false). Usando solo MongoDB.');
      return;
    }

    try {
      this.client = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        username: this.configService.get<string>('REDIS_USERNAME', '') || undefined,
        password: this.configService.get<string>('REDIS_PASSWORD', '') || undefined,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.error('Redis: máximo de reintentos alcanzado, deshabilitando caché');
            return null; // Deja de reintentar
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis conectado exitosamente');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis conexión cerrada');
      });

      await this.client.connect();
    } catch (err) {
      this.logger.warn(`No se pudo conectar a Redis: ${err.message}. Fallback a MongoDB.`);
      this.client = null;
    }
  }

  get available(): boolean {
    return this.isConnected && this.client !== null;
  }

  // === Session Cache ===

  async setSession(sessionId: string, data: any, ttlSeconds = 86400): Promise<boolean> {
    if (!this.available) return false;
    try {
      await this.client!.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.available) return null;
    try {
      const data = await this.client!.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.available) return false;
    try {
      await this.client!.del(`session:${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  // === Generic Cache ===

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.available) return null;
    try {
      const data = await this.client!.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.available) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.available) return false;
    try {
      await this.client!.del(key);
      return true;
    } catch {
      return false;
    }
  }

  // === Health Check ===

  async ping(): Promise<boolean> {
    if (!this.available) return false;
    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
