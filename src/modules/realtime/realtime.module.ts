import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';

@Module({
  controllers: [SSEController],
})
export class RealtimeModule {}
