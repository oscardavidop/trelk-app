import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersUiModule } from './modules/users-ui/users-ui.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';
import { HistoryModule } from './modules/history/history.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CommandFavoritesModule } from './modules/command-favorites/command-favorites.module';
import { CommandStatsModule } from './modules/command-stats/command-stats.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { GithubWebhookModule } from './modules/github-webhook/github-webhook.module';
import { envValidationSchema } from './config/env.validation';

@Global()
@Module({
  imports: [
    // === Configuración centralizada con validación ===
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true, // Falla en el primer error
        allowUnknown: true,
      },
    }),

    // === MongoDB con URI desde env (sin hardcodear credentials) ===
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        // Connection pooling para +1M DAU
        maxPoolSize: 50,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
      }),
      inject: [ConfigService],
    }),

    // === Rate Limiting global ===
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        }],
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    UsersUiModule,
    FavoritesModule,
    PaymentsModule,
    HealthModule,
    RedisModule,
    HistoryModule,
    GamificationModule,
    CommandFavoritesModule,
    CommandStatsModule,
    SuggestionsModule,
    NotificationModule,
    RecommendationsModule,
    GithubWebhookModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limiting global — aplica a todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [
    AppService,
  ],
})
export class AppModule {}
