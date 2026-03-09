import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGamification, UserGamificationSchema } from './schemas/user-gamification.schema';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserGamification.name, schema: UserGamificationSchema },
    ]),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
