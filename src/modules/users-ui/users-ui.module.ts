// src/users-ui/users-ui.module.ts
import { Module } from '@nestjs/common';
import { AjaxUsersUiController } from './users-ui.controller';
import { ConfigController } from './config.controller';
import { SubscriptionController } from './subscription.controller';
import { UsersUiService } from './users-ui.service';
import { UserModule } from '../users/user.module';

@Module({
  imports: [UserModule],
  controllers: [AjaxUsersUiController, ConfigController, SubscriptionController],
  providers: [UsersUiService],
})
export class UsersUiModule {}
