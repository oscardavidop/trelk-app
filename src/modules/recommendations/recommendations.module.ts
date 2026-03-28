import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandRating, CommandRatingSchema } from '../command-stats/schemas/command-rating.schema';
import { CommandFavorite, CommandFavoriteSchema } from '../command-favorites/schemas/command-favorite.schema';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: History.name, schema: HistorySchema },
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
    ]),
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
