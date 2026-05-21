// src/modules/users-ui/subscription.controller.ts
// REST JSON endpoints for subscription management
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from '../users/user.service';
import { PaymentsClientService } from '../payments/payments-client.service';
import {
  ChangePlanDto,
  AutoRenewDto,
  CheckoutDto,
  ReviseSubscriptionDto,
  CancelActiveSubscriptionDto,
  ResumeSubscriptionDto,
  CancelDowngradeAppDto,
  StarsInvoiceDto,
} from '../users/dto/subscription.dto';
import { AppError, ErrorCode } from '../../common/errors';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1/ui/subscription')
@UseGuards(BearerAuthGuard)
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly userService: UserService,
    private readonly paymentsClient: PaymentsClientService,
    private readonly config: ConfigService,
  ) {}

  // ── Estado local (pro_features del usuario) ─────────────────────────────

  /** GET /api/v1/ui/subscription — full subscription + pro_features (local DB) */
  @Get()
  async getSubscription(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const data = await this.userService.getSubscription(telegramId);
    if (!data) throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    return { ok: true, ...data };
  }

  /** POST /api/v1/ui/subscription/change — local plan change (legacy, no PayPal) */
  @Post('change')
  async changePlan(@Body() dto: ChangePlanDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.requestPlanChange(telegramId, dto.plan);
    return { ok: true, msg: `Plan change to ${dto.plan} processed` };
  }

  /** POST /api/v1/ui/subscription/cancel-change — cancel pending plan change */
  @Post('cancel-change')
  async cancelChange(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.cancelPlanChange(telegramId);
    return { ok: true, msg: 'Pending change canceled' };
  }

  /** PATCH /api/v1/ui/subscription/auto-renew — toggle auto-renew */
  @Patch('auto-renew')
  async setAutoRenew(@Body() dto: AutoRenewDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);

    // Get real subscription status to know if we can call PayPal
    const status = await this.paymentsClient.getUserStatus(telegramId);
    const subscription = status?.subscription;

    // If user has a real PayPal subscription in a state where suspend/activate applies, use it
    const canTogglePaypal =
      subscription?.id &&
      (status.status === 'ACTIVE' || status.status === 'SUSPENDED');

    if (canTogglePaypal) {
      // Delegate to PayPal suspend/activate — also updates local DB via webhook
      await this.paymentsClient.setAutoRenew(telegramId, subscription!.id, dto.auto_renew);
    } else {
      // Fallback: only update local flag (no real subscription to toggle)
      await this.userService.setAutoRenew(telegramId, dto.auto_renew);
    }

    return { ok: true, auto_renew: dto.auto_renew };
  }

  // ── Planes disponibles ───────────────────────────────────────────────────

  /**
   * GET /api/v1/ui/subscription/plans
   * Devuelve los planes activos desde el backend de payments.
   * No contiene datos sensibles (sin plan IDs de PayPal internos de DB).
   */
  @Get('plans')
  async getPlans() {
    const plans = await this.paymentsClient.getPlans();
    return { ok: true, plans };
  }

  // ── Estado real desde payments backend ──────────────────────────────────

  /**
   * GET /api/v1/ui/subscription/status
   * Estado completo de la suscripción del usuario autenticado,
   * incluyendo próxima fecha de cobro y estado real de PayPal.
   */
  @Get('status')
  async getStatus(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const status = await this.paymentsClient.getUserStatus(telegramId);
    return { ok: true, ...status };
  }

  // ── Nueva suscripción ────────────────────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/checkout
   * Inicia el flujo de una nueva suscripción PayPal.
   *
   * Devuelve { subscriptionId, approvalUrl }.
   * La mini app debe redirigir al usuario a `approvalUrl`.
   * PayPal llamará a `return_url` tras la aprobación.
   *
   * Seguridad:
   * - El usuario autenticado solo puede crear suscripciones para sí mismo.
   * - La validación del plan_id se hace en el backend de payments.
   * - Solo se permite si no hay suscripción activa/pendiente.
   */
  @Post('checkout')
  async checkout(@Body() dto: CheckoutDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);

    const result = await this.paymentsClient.createCheckout(
      telegramId,
      dto.plan_id,
      dto.return_url,
      dto.cancel_url,
      dto.start_time,
    );

    this.logger.log(
      `Checkout initiated for user ${telegramId}: sub=${result.subscriptionId}`,
    );

    return { ok: true, subscriptionId: result.subscriptionId, approvalUrl: result.approvalUrl };
  }

  // ── Upgrade / Downgrade ──────────────────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/revise
   * Cambia el plan de una suscripción activa (upgrade o downgrade).
   *
   * Devuelve { approvalUrl, requiresApproval }.
   * Si `requiresApproval` es true, redirigir al usuario a `approvalUrl`.
   * PayPal disparará BILLING.SUBSCRIPTION.UPDATED tras la aprobación.
   *
   * Seguridad:
   * - Ownership verificado en el backend de payments.
   * - El usuario autenticado no puede cambiar suscripciones de otros.
   */
  @Post('revise')
  async revise(@Body() dto: ReviseSubscriptionDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);

    const result = await this.paymentsClient.reviseSubscription(
      telegramId,
      dto.subscription_id,
      dto.new_plan_id,
      dto.return_url,
      dto.cancel_url,
    );

    this.logger.log(
      `Plan revision initiated for user ${telegramId}: sub=${dto.subscription_id} → plan=${dto.new_plan_id}`,
    );

    return {
      ok: true,
      approvalUrl: result.approvalUrl,
      requiresApproval: result.requiresApproval,
    };
  }

  // ── Cancelación real ─────────────────────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/cancel
   * Cancela la suscripción en PayPal y en nuestra DB.
   *
   * Diferente de `cancel-change` (que solo cancela un cambio pendiente local).
   * Este endpoint cancela la suscripción REAL de PayPal.
   *
   * Seguridad:
   * - Ownership verificado en el backend de payments.
   * - Llamada a PayPal API real.
   */
  @Post('cancel')
  async cancelSubscription(@Body() dto: CancelActiveSubscriptionDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);

    await this.paymentsClient.cancelSubscription(telegramId, dto.subscription_id);

    this.logger.log(
      `Subscription cancelled for user ${telegramId}: sub=${dto.subscription_id}`,
    );

    return { ok: true, status: 'cancelled' };
  }

  // ── Reanudación ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/resume
   * Reanuda una suscripción suspendida.
   */
  @Post('resume')
  async resumeSubscription(@Body() dto: ResumeSubscriptionDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.paymentsClient.resumeSubscription(telegramId, dto.subscription_id);
    this.logger.log(`Subscription resumed for user ${telegramId}: sub=${dto.subscription_id}`);
    return { ok: true, status: 'resumed' };
  }

  // ── Cancelar downgrade programado ───────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/cancel-downgrade
   * Cancela un downgrade programado — el usuario mantiene su plan actual.
   */
  @Post('cancel-downgrade')
  async cancelDowngrade(@Body() dto: CancelDowngradeAppDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const result = await this.paymentsClient.cancelScheduledDowngrade(
      telegramId,
      dto.subscription_id,
      dto.return_url,
      dto.cancel_url,
    );
    this.logger.log(`Scheduled downgrade cancelled for user ${telegramId}: sub=${dto.subscription_id} requiresApproval=${result.requiresApproval}`);
    return {
      ok: true,
      approvalUrl: result.approvalUrl,
      requiresApproval: result.requiresApproval,
      status: result.requiresApproval ? 'approval_required' : 'downgrade_cancelled',
    };
  }

  // ── Telegram Stars invoice ───────────────────────────────────────────────

  /**
   * POST /api/v1/ui/subscription/stars/invoice
   *
   * Creates a Telegram Stars invoice link for the given plan.
   * The Mini App passes the returned invoiceUrl to Telegram.WebApp.openInvoice().
   *
   * On successful payment, the bot forwards the event to the payments backend,
   * which activates the subscription. The Mini App can poll /status to confirm.
   */
  @Post('stars/invoice')
  async createStarsInvoice(@Body() dto: StarsInvoiceDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const result = await this.paymentsClient.createStarsInvoice(telegramId, dto.plan_name);
    this.logger.log(`Stars invoice created for user ${telegramId}: plan=${dto.plan_name}`);
    return { ok: true, ...result };
  }

  // ── Historial de billing ─────────────────────────────────────────────────

  /**
   * GET /api/v1/ui/subscription/billing-history
   * Historial de eventos de la suscripción del usuario.
   * Cursored pagination: ?cursor=...&limit=20
   */
  @Get('billing-history')
  async billingHistory(
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
    @Req() req: any,
  ) {
    const telegramId = this.extractTelegramId(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);

    // Proxy to payments admin API (reuses existing /api/v1/ui/payments/history)
    // The payments module PaymentsService reads from the same DB with user filter
    // For now, returns status + empty history (billing history is in admin panel)
    const status = await this.paymentsClient.getUserStatus(telegramId);

    return {
      ok: true,
      subscription: status.subscription,
      status: status.status,
      isPremium: status.isPremium,
      // History is available in admin panel at /api/v1/ui/payments/history
      historyNote: 'Full billing history available in admin panel',
    };
  }

  // ── Helpers ─────────────────────────────────────

  private extractTelegramId(req: any): number {
    const user = req.user;
    return (
      user.authTelegram?.id ||
      user.authUser?.telegramId ||
      user.authUser?.id
    );
  }
}
