import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { PaymentEvent, PaymentEventSchema } from './schemas/payment-event.schema';

@Module({
  imports: [
    // Second MongoDB connection — "payments" database
    MongooseModule.forRootAsync({
      connectionName: 'payments',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const baseUri = config.get<string>('MONGODB_URI')!;
        // Replace the database name in the URI with 'payments'
        const paymentsUri = baseUri.replace(/\/[^/?]+(\?|$)/, '/payments$1');
        return {
          uri: paymentsUri,
          maxPoolSize: 10,
          minPoolSize: 2,
          socketTimeoutMS: 30000,
          serverSelectionTimeoutMS: 5000,
          retryWrites: true,
        };
      },
      inject: [ConfigService],
    }),
    // Register schemas on the "payments" connection
    MongooseModule.forFeature(
      [
        { name: Subscription.name, schema: SubscriptionSchema },
        { name: PaymentEvent.name, schema: PaymentEventSchema },
      ],
      'payments',
    ),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
