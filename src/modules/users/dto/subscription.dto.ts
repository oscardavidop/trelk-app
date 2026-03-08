// src/modules/users/dto/subscription.dto.ts
import { IsIn, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ChangePlanDto {
  @IsIn(['free', 'pro', 'ultra'])
  plan: 'free' | 'pro' | 'ultra';
}

export class AutoRenewDto {
  @IsBoolean()
  auto_renew: boolean;
}
