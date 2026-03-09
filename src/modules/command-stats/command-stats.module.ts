import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from './schemas/command-rating.schema';
import { CommandReport, CommandReportSchema } from './schemas/command-report.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteSchema } from '../command-favorites/schemas/command-favorite.schema';
import { CommandStatsService } from './command-stats.service';
import { CommandStatsController } from './command-stats.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: CommandReport.name, schema: CommandReportSchema },
      { name: History.name, schema: HistorySchema },
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
    ]),
  ],
  controllers: [CommandStatsController],
  providers: [CommandStatsService],
  exports: [CommandStatsService],
})
export class CommandStatsModule {}
