import { Module } from '@nestjs/common';
import { HealthController, StatusController } from './health.controller';

@Module({
  controllers: [HealthController, StatusController],
})
export class HealthModule {}
