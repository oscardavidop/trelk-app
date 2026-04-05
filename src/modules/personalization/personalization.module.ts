import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteSchema } from '../command-favorites/schemas/command-favorite.schema';
import { PersonalizationService } from './personalization.service';
import { PersonalizationController } from './personalization.controller';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: History.name, schema: HistorySchema }],
      'mbot',
    ),
    MongooseModule.forFeature([
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
    ]),
  ],
  controllers: [PersonalizationController],
  providers: [PersonalizationService],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}
