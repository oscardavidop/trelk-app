import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: History.name, schema: HistorySchema }],
      'mbot',
    ),
  ],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
