// src/modules/auth/auth.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtStrategy } from './helpers/jwt.strategy';

import { Token, TokenSchema } from './schemas/token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { UserModule } from '../users/user.module';
import { TelegramAuthService } from './services/telegram-auth.service';
import { TelegramInitDataGuard } from './guards/telegram-init-data.guard';
import { DynamicAuthGuard } from './guards/dynamic.guard';
import { BearerStrategy } from './helpers/bearer.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
    ]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ], 'mbot'),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TelegramAuthService,
    TelegramInitDataGuard,
    DynamicAuthGuard,
    JwtStrategy,
    BearerStrategy,
  ],
  exports: [AuthService, TelegramAuthService, TelegramInitDataGuard, DynamicAuthGuard],
})
export class AuthModule { }
