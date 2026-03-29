import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

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
import { AbuseModule } from './modules/abuse/abuse.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { MetricsInterceptor } from './modules/metrics/metrics.interceptor';
import { SanitizationInterceptor } from './common/interceptors/sanitization.interceptor';
import { FeatureFlagsService } from './common/services/feature-flags.service';
import { envValidationSchema } from './config/env.validation';
import { getMongoConfig, getMongoMiniAppConfig } from './config/database.config';

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

    // === MongoDB con configuración optimizada para +1M DAU ===
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => getMongoConfig(config),
      inject: [ConfigService],
      // connectionName: 'mbot',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => getMongoMiniAppConfig(config),
      inject: [ConfigService],
      connectionName: 'miniapp',
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
    AbuseModule,
    MetricsModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    FeatureFlagsService,
    // Rate limiting global — aplica a todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Observability — track every request latency/error
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    // Security — sanitize all inputs globally
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizationInterceptor,
    },
  ],
  exports: [
    AppService,
    FeatureFlagsService,
  ],
})
export class AppModule { }
