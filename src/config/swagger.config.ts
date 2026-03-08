import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configura Swagger/OpenAPI solo en desarrollo.
 * En producción no se expone la documentación.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Trelk Mini App API')
    .setDescription('API para Telegram Mini App — gestión de bots, usuarios y configuración')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('session_id')
    .addTag('auth', 'Autenticación Telegram')
    .addTag('users', 'Gestión de usuarios')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
