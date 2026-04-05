import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandFavorite, CommandFavoriteSchema } from './schemas/command-favorite.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandFavoritesService } from './command-favorites.service';
import { CommandFavoritesController } from './command-favorites.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
      { name: History.name, schema: HistorySchema },
    ]),
  ],
  controllers: [CommandFavoritesController],
  providers: [CommandFavoritesService],
  exports: [CommandFavoritesService],
})
export class CommandFavoritesModule { }
