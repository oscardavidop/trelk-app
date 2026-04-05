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
import { CommandReliabilityModule } from './modules/command-reliability/command-reliability.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { GithubWebhookModule } from './modules/github-webhook/github-webhook.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AbuseModule } from './modules/abuse/abuse.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { LiveModule } from './modules/live/live.module';
import { SecurityModule } from './modules/security/security.module';
import { SearchModule } from './modules/search/search.module';
import { DeepLinkModule } from './modules/deep-link/deep-link.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { AnalyticsTrackingModule } from './modules/analytics-tracking/analytics-tracking.module';
import { PendingDeleteModule } from './modules/pending-delete/pending-delete.module';
import { ResilienceModule } from './core/resilience';
import { UserStateModule } from './core/user-state';
import { LiveTrackingInterceptor } from './modules/live/live-tracking.interceptor';
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

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => getMongoMiniAppConfig(config),
      inject: [ConfigService]
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => getMongoConfig(config),
      inject: [ConfigService],
      connectionName: 'mbot',
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
    CommandReliabilityModule,
    SuggestionsModule,
    NotificationModule,
    RecommendationsModule,
    GithubWebhookModule,
    AlertsModule,
    AbuseModule,
    MetricsModule,
    RealtimeModule,
    LiveModule,
    SecurityModule,
    SearchModule,
    DeepLinkModule,
    PersonalizationModule,
    AnalyticsTrackingModule,
    PendingDeleteModule,
    ResilienceModule,
    UserStateModule,
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
    // Live metrics — track active users & command usage
    {
      provide: APP_INTERCEPTOR,
      useClass: LiveTrackingInterceptor,
    },
  ],
  exports: [
    AppService,
    FeatureFlagsService,
  ],
})
export class AppModule { }
