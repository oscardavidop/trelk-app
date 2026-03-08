import * as Joi from 'joi';

/**
 * Esquema de validación para variables de entorno.
 * Si falta alguna variable REQUERIDA, la app NO arranca.
 */
export const envValidationSchema = Joi.object({
  // === App ===
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'staging', 'test')
    .default('development'),
  PORT: Joi.number().default(3008),
  ENVIROMENT: Joi.string().default('DEV'),

  // === MongoDB ===
  MONGODB_URI: Joi.string().uri().required().messages({
    'any.required': 'MONGODB_URI es obligatorio. Ejemplo: mongodb+srv://user:pass@cluster.mongodb.net/db',
  }),

  // === JWT ===
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET es obligatorio y debe tener mínimo 32 caracteres',
    'string.min': 'JWT_SECRET debe tener mínimo 32 caracteres para seguridad en producción',
  }),
  JWT_EXPIRATION: Joi.number().default(86400), // 24h default

  // === Telegram ===
  BOT_TOKEN: Joi.string().required().messages({
    'any.required': 'BOT_TOKEN de Telegram es obligatorio',
  }),
  TG_AUTH_MAX_AGE: Joi.number().default(86400),

  // === Redis (opcional en dev, requerido en prod) ===
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_USERNAME: Joi.string().allow('').default(''),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_ENABLED: Joi.boolean().default(false),

  // === CORS ===
  CORS_ORIGINS: Joi.string().default('https://app.trelk.site,https://web.telegram.org'),

  // === Rate Limiting ===
  THROTTLE_TTL: Joi.number().default(60000), // 1 minuto en ms
  THROTTLE_LIMIT: Joi.number().default(100), // 100 req/min

  // === External services (opcionales) ===
  TWILIO_ACCOUNT_SID: Joi.string().allow('').optional(),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
  EPAYCO_P_KEY: Joi.string().allow('').optional(),
}).unknown(true); // Permite variables extra sin fallar

/**
 * Tipos inferidos para usar con ConfigService.get<T>
 */
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: number;
  BOT_TOKEN: string;
  TG_AUTH_MAX_AGE: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_USERNAME: string;
  REDIS_PASSWORD: string;
  REDIS_ENABLED: boolean;
  CORS_ORIGINS: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
}
