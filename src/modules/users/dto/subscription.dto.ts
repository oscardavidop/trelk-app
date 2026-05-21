// src/modules/users/dto/subscription.dto.ts
import { IsIn, IsBoolean, IsString, IsNotEmpty, IsUrl, Matches, IsOptional, IsDateString } from 'class-validator';

export class ChangePlanDto {
  @IsIn(['free', 'pro', 'ultra'])
  plan: 'free' | 'pro' | 'ultra';
}

export class AutoRenewDto {
  @IsBoolean()
  auto_renew: boolean;
}

/** DTO para iniciar una nueva suscripción desde cero */
export class CheckoutDto {
  /** PayPal plan ID (P-...) elegido por el usuario */
  @IsString()
  @IsNotEmpty()
  // @Matches(/^P-[A-Z0-9]{16,}$/, { message: 'plan_id must be a valid PayPal plan ID (P-...)' })
  plan_id: string;

  /** URL de retorno tras la aprobación en PayPal */
  @IsUrl({ require_tld: false }, { message: 'return_url must be a valid URL' })
  return_url: string;

  /** URL de cancelación si el usuario abandona el flujo */
  @IsUrl({ require_tld: false }, { message: 'cancel_url must be a valid URL' })
  cancel_url: string;

  /**
   * Fecha ISO 8601 para inicio diferido (re-suscripción después de cancel_at_period_end).
   * Si se omite, la suscripción inicia inmediatamente al aprobar en PayPal.
   */
  @IsOptional()
  @IsDateString({}, { message: 'start_time must be an ISO 8601 date string' })
  start_time?: string;
}

/** DTO para cambiar el plan de una suscripción activa (upgrade / downgrade) */
export class ReviseSubscriptionDto {
  /** PayPal subscription ID actual (I-...) */
  @IsString()
  @IsNotEmpty()
  // @Matches(/^I-[A-Z0-9]{8,}$/, { message: 'subscription_id must be a valid PayPal subscription ID (I-...)' })
  subscription_id: string;

  /** Nuevo plan (P-...) */
  @IsString()
  @IsNotEmpty()
  @Matches(/^P-[A-Z0-9]{8,}$/, { message: 'new_plan_id must be a valid PayPal plan ID (P-...)' })
  new_plan_id: string;

  /** URL de retorno tras aprobación */
  @IsUrl({ require_tld: false }, { message: 'return_url must be a valid URL' })
  return_url: string;

  /** URL de cancelación */
  @IsUrl({ require_tld: false }, { message: 'cancel_url must be a valid URL' })
  cancel_url: string;
}

/** DTO para cancelar la suscripción activa */
export class CancelActiveSubscriptionDto {
  /** PayPal subscription ID (I-...) a cancelar */
  @IsString()
  @IsNotEmpty()
  // @Matches(/^I-[A-Z0-9]{8,}$/, { message: 'subscription_id must be a valid PayPal subscription ID (I-...)' })
  subscription_id: string;
}

/** DTO para reanudar una suscripción suspendida */
export class ResumeSubscriptionDto {
  /** PayPal subscription ID (I-...) a reanudar */
  @IsString()
  @IsNotEmpty()
  // @Matches(/^I-[A-Z0-9]{8,}$/, { message: 'subscription_id must be a valid PayPal subscription ID (I-...)' })
  subscription_id: string;
}

/** DTO para cancelar un downgrade pendiente (volver al plan actual) */
export class CancelDowngradeAppDto {
  /** PayPal subscription ID (I-...) */
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  /** URL de retorno PayPal tras aprobación */
  @IsUrl({ require_tld: false }, { message: 'return_url must be a valid URL' })
  return_url: string;

  /** URL de cancelación PayPal */
  @IsUrl({ require_tld: false }, { message: 'cancel_url must be a valid URL' })
  cancel_url: string;
}
