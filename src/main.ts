import { NestFactory } from "@nestjs/core";
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from "./app.module";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'path';
import * as qs from 'qs';
import { GlobalExceptionFilter } from "./common/filters/global-error.filter";
import { setupSwagger } from "./config/swagger.config";

import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({
    bodyLimit: 1048576,
  }), {
    bodyParser: false,
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const fastify = app.getHttpAdapter().getInstance();

  // === Compresión gzip ===
  await fastify.register(fastifyCompress as any, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  // === CORS restrictivo ===
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'https://app.trelk.site,https://web.telegram.org');
  await fastify.register(fastifyCors as any, {
    origin: (origin: string, callback: Function) => {
      const allowed = corsOrigins.split(',').map((s: string) => s.trim());
      if (!origin || allowed.includes(origin) || configService.get('NODE_ENV') === 'development') {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-telegram-init-data'],
  });

  // === Helmet security headers ===
  await fastify.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", "'unsafe-inline'", "'unsafe-eval'",
          "https://telegram.org", "https://webappinternal.telegram.org",
        ],
        styleSrc: [
          "'self'", "'unsafe-inline'",
          "https://telegram.org", "https://webappinternal.telegram.org",
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://apps-telegram.trelkbot.com", "wss:"],
        frameSrc: ["'self'", "https://*.telegram.org", "https://*.t.me"],
        frameAncestors: ["'self'", "https://*.telegram.org", "https://*.t.me"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // === Multipart (file uploads) ===
  await fastify.register(fastifyMultipart as any, {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB max per file
      files: 3,                   // max 3 files
      fields: 10,
    },
  });

  // === Static files: React SPA build ===
  await fastify.register(fastifyStatic as any, {
    root: join(process.cwd(), 'frontend/dist'),
    prefix: '/',
    decorateReply: true,
    wildcard: false,
  });

  // === Legacy static assets (public/assets) ===
  await fastify.register(fastifyStatic as any, {
    root: join(process.cwd(), 'public/assets'),
    prefix: '/public/',
    decorateReply: false,
    maxAge: '1d',
    immutable: false,
  });

  // === Custom body parser para x-www-form-urlencoded (framework Aj) ===
  // === JSON parser that preserves raw body (needed for webhook HMAC verification) ===
  fastify.decorateRequest('rawBody', null);
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: any, body: Buffer, done: any) => {
      // Store raw bytes for HMAC signature verification (GitHub webhooks)
      req.rawBody = body;
      try {
        done(null, body.length > 0 ? JSON.parse(body.toString('utf8')) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  fastify.removeContentTypeParser('application/x-www-form-urlencoded');
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (req: any, body: any, done: any) => {
      try {
        const parsed = qs.parse(body as any);
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // === Security headers para Telegram iframe ===
  fastify.addHook('onSend', async (request: any, reply: any, payload: any) => {
    reply.header('x-frame-options', 'ALLOWALL');
    reply.header('X-Download-Options', 'noopen');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    return payload;
  });

  // === Global exception filter ===
  // Catches ALL exceptions → standard { ok: false, error: { code, message, i18nKey, ... } }
  // Also handles SPA fallback for non-API 404 routes
  app.useGlobalFilters(new GlobalExceptionFilter());

  // === Swagger (solo en desarrollo) ===
  if (configService.get('NODE_ENV') !== 'production') {
    setupSwagger(app);
    logger.log(`Swagger docs: http://0.0.0.0:${configService.get('PORT', 3008)}/api/docs`);
  }

  // === Start server ===
  const port = configService.get<number>('PORT', 3008);
  await app.listen(port, "0.0.0.0");
  logger.log(`Server running on http://0.0.0.0:${port}`);
  logger.log(`Environment: ${configService.get('NODE_ENV', 'development')}`);
  logger.log(`CORS origins: ${corsOrigins}`);
  logger.log(`Rate limit: ${configService.get('THROTTLE_LIMIT', 100)} req/${configService.get('THROTTLE_TTL', 60000)}ms`);

  // === Graceful shutdown ===
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        logger.log('Application closed successfully');
      } catch (err) {
        logger.error(`Error during shutdown: ${(err as Error).message}`);
      }
      process.exit(0);
    });
  }

  // === Unhandled rejection safety net ===
  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  });
}

bootstrap();
