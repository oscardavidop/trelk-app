import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { join } from 'path';

/**
 * AuthExceptionFilter — Maneja UnauthorizedException de forma consistente.
 * En arquitectura SPA desacoplada, SIEMPRE responde JSON.
 * El frontend React se encarga de redirigir al usuario a /auth.
 */
@Catch(UnauthorizedException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    if (exception.message === 'expired-session') {
      return res.status(401).send({ error: 'Unauthorized access - session expired' });
    }

    if (exception.message === 'expired-session-view') {
      return res.status(401).send({ error: 'Unauthorized access' });
    }

    res.status(401).send({ error: exception.message || 'Unauthorized' });
  }
}

/**
 * SpaFallbackFilter — Intercepta NotFoundException (rutas no encontradas).
 * - Rutas API/health → responde JSON 404
 * - Cualquier otra ruta → sirve index.html para que React Router maneje el routing
 */
@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const res = ctx.getResponse<FastifyReply>();
    const url = req.url;

    // Rutas API o health → devolver 404 JSON
    if (
      url.startsWith('/api/') ||
      url.startsWith('/users/api') ||
      url.startsWith('/health')
    ) {
      return res.status(404).send({ statusCode: 404, error: 'Not Found' });
    }

    // Cualquier otra ruta → servir el SPA (React Router se encarga del routing)
    return res.sendFile('index.html', join(process.cwd(), 'frontend/dist'));
  }
}
