import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserStateService } from './user-state.service';
import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import { RedisModule } from '../../modules/redis/redis.module';

@Global()
@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], 'mbot'),
  ],
  providers: [UserStateService],
  exports: [UserStateService],
})
export class UserStateModule {}
