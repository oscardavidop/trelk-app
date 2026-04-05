import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SSEController } from './sse.controller';
import { Token, TokenSchema } from '../auth/schemas/token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], 'mbot'),
  ],
  controllers: [SSEController],
})
export class RealtimeModule {}
