// src/modules/auth/services/telegram-auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import { TelegramUserData } from '../../users/user.service';

/** Resultado de la validación de initData */
export interface TelegramInitDataResult {
  /** Datos del usuario Telegram parseados */
  user: TelegramUserData;
  /** auth_date original (unix timestamp) */
  authDate: number;
  /** Hash original enviado por Telegram */
  hash: string;
  /** Query string original (sin parsear) */
  raw: string;
}

/**
 * Servicio exclusivo para validar initData de Telegram Mini Apps.
 *
 * Implementa la validación oficial:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * Protecciones:
 * - Firma HMAC-SHA256 con timing-safe comparison
 * - Protección contra replay attacks via auth_date
 * - Validación de campos obligatorios
 */
@Injectable()
export class TelegramAuthService {
  private readonly logger = new Logger(TelegramAuthService.name);
  private authAgeBoundsWarned = false;

  private normalizeInitData(rawInitData: string): string {
    let current = (rawInitData ?? '').trim();

    // Telegram initData can arrive URL-encoded by transport layers.
    // Decode progressively only if required fields are still missing.
    for (let i = 0; i < 2; i++) {
      const parsed = qs.parse(current);
      if (parsed.hash && parsed.auth_date && parsed.user) {
        return current;
      }

      const looksEncoded = /%26|%3D|%25/i.test(current);
      if (!looksEncoded) {
        break;
      }

      try {
        const decoded = decodeURIComponent(current);
        if (!decoded || decoded === current) {
          break;
        }
        current = decoded;
      } catch {
        break;
      }
    }

    return current;
  }

  /** Tiempo máximo permitido para auth_date */
  private get MAX_AUTH_AGE_SECONDS(): number {
    const configured = Number(this.configService.get<number>('TG_AUTH_MAX_AGE', 86400));
    const fallback = 86400; // 24h
    const minAllowed = 1800; // 30m
    const maxAllowed = 604800; // 7d

    if (!Number.isFinite(configured) || configured <= 0) {
      if (!this.authAgeBoundsWarned) {
        this.authAgeBoundsWarned = true;
        this.logger.warn(`TG_AUTH_MAX_AGE inválido (${configured}). Usando fallback ${fallback}s.`);
      }
      return fallback;
    }

    const bounded = Math.min(Math.max(configured, minAllowed), maxAllowed);

    if (bounded !== configured && !this.authAgeBoundsWarned) {
      this.authAgeBoundsWarned = true;
      this.logger.warn(
        `TG_AUTH_MAX_AGE fuera de rango (${configured}). Ajustado a ${bounded}s (rango permitido ${minAllowed}-${maxAllowed}).`,
      );
    }

    return bounded;
  }

  /** Bot token cargado desde ConfigService */
  private get botToken(): string {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN no está configurado en las variables de entorno');
    }
    return token;
  }

  constructor(private readonly configService: ConfigService) {}

  /**
   * Valida el initData completo recibido desde el frontend.
   * 
   * @param initData - Query string crudo tal como lo provee window.Telegram.WebApp.initData
   * @returns Datos validados del usuario Telegram
   * @throws UnauthorizedException si la firma, fecha o datos son inválidos
   */
  validateInitData(initData: string): TelegramInitDataResult {
    if (!initData || typeof initData !== 'string') {
      throw new UnauthorizedException('INIT_DATA_MISSING');
    }

    const normalizedInitData = this.normalizeInitData(initData);

    // 1. Parsear la query string
    const parsed = qs.parse(normalizedInitData);

    // 2. Extraer y validar hash
    const hash = parsed.hash as string;
    if (!hash) {
      throw new UnauthorizedException('INIT_DATA_HASH_MISSING');
    }

    // 3. Validar auth_date (protección contra replay attacks)
    const authDateStr = parsed.auth_date as string;
    if (!authDateStr) {
      throw new UnauthorizedException('INIT_DATA_AUTH_DATE_MISSING');
    }

    const authDate = Number(authDateStr);
    if (isNaN(authDate)) {
      throw new UnauthorizedException('INIT_DATA_AUTH_DATE_INVALID');
    }

    const now = Math.floor(Date.now() / 1000);
    const age = now - authDate;

    if (age > this.MAX_AUTH_AGE_SECONDS) {
      this.logger.warn(
        `initData expirado: auth_date=${authDate}, age=${age}s, max=${this.MAX_AUTH_AGE_SECONDS}s`,
      );
      throw new UnauthorizedException('INIT_DATA_EXPIRED');
    }

    if (age < -30) {
      // auth_date en el futuro (> 30s de tolerancia) = posible manipulación
      this.logger.warn(`auth_date en el futuro: auth_date=${authDate}, now=${now}`);
      throw new UnauthorizedException('INIT_DATA_AUTH_DATE_FUTURE');
    }

    // 4. Validar firma HMAC-SHA256 (timing-safe)
    if (!this.verifyHmacSignature(hash, normalizedInitData)) {
      this.logger.warn('Firma HMAC inválida en initData');
      throw new UnauthorizedException('INIT_DATA_SIGNATURE_INVALID');
    }

    // 5. Parsear y validar campo user
    const userRaw = parsed.user as string;
    if (!userRaw) {
      throw new UnauthorizedException('INIT_DATA_USER_MISSING');
    }

    let user: TelegramUserData;
    try {
      user = JSON.parse(userRaw);
    } catch {
      throw new UnauthorizedException('INIT_DATA_USER_PARSE_ERROR');
    }

    if (!user.id || typeof user.id !== 'number') {
      throw new UnauthorizedException('INIT_DATA_USER_ID_INVALID');
    }

    if (!user.data || typeof user.data.first_name !== 'string') {
      throw new UnauthorizedException('INIT_DATA_USER_NAME_MISSING');
    }

    this.logger.log(
      `initData válido para usuario ${user.id} (@${user.username ?? 'sin username'})`,
    );

    return {
      user,
      authDate,
      hash,
      raw: normalizedInitData,
    };
  }

  /**
   * Verifica la firma HMAC-SHA256 según la documentación oficial de Telegram.
   *
   * Algoritmo:
   * 1. Construir data_check_string: pares key=value (excepto hash), ordenados alfabéticamente, separados por \n
   * 2. secret_key = HMAC-SHA256("WebAppData", bot_token)
   * 3. Comparar HMAC-SHA256(secret_key, data_check_string) === hash (timing-safe)
   */
  private verifyHmacSignature(hash: string, initData: string): boolean {
    // Construir data_check_string
    const dataCheckString = initData
      .split('&')
      .filter((chunk) => !chunk.startsWith('hash='))
      .map((chunk) => {
        const eqIndex = chunk.indexOf('=');
        const key = chunk.substring(0, eqIndex);
        const value = decodeURIComponent(chunk.substring(eqIndex + 1));
        return `${key}=${value}`;
      })
      .sort()
      .join('\n');

    // Generar secret key: HMAC-SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();

    // Calcular hash esperado
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Comparación timing-safe para prevenir timing attacks
    const hashBuffer = Buffer.from(hash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (hashBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, computedBuffer);
  }
}
