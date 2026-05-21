/**
 * PaymentsClientService
 *
 * Thin HTTP client that communicates with the payments backend.
 * ALL sensitive billing logic lives in the payments service.
 * This class ONLY forwards requests and parses responses.
 *
 * - Idempotency keys are generated here to prevent duplicate requests.
 * - Errors are mapped to NestJS exceptions for consistent API responses.
 */
import {
  Injectable,
  Logger,
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────

export interface PlanSummary {
  name: string;
  plan_id: string;
  price: number;
  currency: string;
  displayName: string;
}

export interface SubscriptionStatus {
  status: 'FREE' | 'ACTIVE' | 'SUSPENDED' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    next_billing_date: string | null;
    amount: number | null;
    currency: string;
    start_time: string | null;
    cancelled_at: string | null;
    cancel_at_period_end: boolean;
    scheduled_plan_id: string | null;
    billing_preview?: {
      plan_id: string;
      amount: number;
      currency: string;
      date: string | null;
    } | null;
  } | null;
  isPremium: boolean;
}

export interface CheckoutResult {
  subscriptionId: string;
  approvalUrl: string;
}

export interface ReviseResult {
  approvalUrl: string | null;
  requiresApproval: boolean;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentsClientService {
  private readonly logger = new Logger(PaymentsClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('PAYMENTS_API_URL', 'http://localhost:3002');
    this.apiKey = this.config.get<string>('PAYMENTS_API_KEY', '');
  }

  // ── Plans ──────────────────────────────────────────────────────────────

  async getPlans(): Promise<PlanSummary[]> {
    const data = await this.request<{ plans: PlanSummary[] }>('GET', '/paypal/plans');
    return data.plans ?? [];
  }

  // ── User subscription status ───────────────────────────────────────────

  async getUserStatus(telegramId: number): Promise<SubscriptionStatus> {
    const data = await this.request<SubscriptionStatus>(
      'GET',
      `/paypal/user-status?tg_id=${telegramId}`,
      undefined,
      { auth: true },
    );
    return data;
  }

  // ── Checkout (new subscription) ────────────────────────────────────────

  async createCheckout(
    telegramId: number,
    planId: string,
    returnUrl: string,
    cancelUrl: string,
    startTime?: string,
  ): Promise<CheckoutResult> {
    const idempotencyKey = this.idempotencyKey('checkout', telegramId, planId);

    const body: Record<string, any> = {
      tg_id: telegramId,
      plan_id: planId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    };
    if (startTime) body.start_time = startTime;

    const data = await this.request<CheckoutResult>(
      'POST',
      '/paypal/subscription/create',
      body,
      { auth: true, idempotencyKey },
    );
    return data;
  }

  // ── Upgrade / Downgrade ────────────────────────────────────────────────

  async reviseSubscription(
    telegramId: number,
    subscriptionId: string,
    newPlanId: string,
    returnUrl: string,
    cancelUrl: string,
  ): Promise<ReviseResult> {
    const idempotencyKey = this.idempotencyKey('revise', telegramId, subscriptionId, newPlanId);

    const data = await this.request<ReviseResult>(
      'POST',
      '/paypal/subscription/revise',
      {
        tg_id: telegramId,
        subscription_id: subscriptionId,
        new_plan_id: newPlanId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
      { auth: true, idempotencyKey },
    );
    return data;
  }

  // ── Auto-renew (suspend / activate via PayPal) ─────────────────────────

  async setAutoRenew(
    telegramId: number,
    subscriptionId: string,
    autoRenew: boolean,
  ): Promise<{ auto_renew: boolean; status: string }> {
    const data = await this.request<{ auto_renew: boolean; status: string }>(
      'POST',
      '/paypal/subscription/auto-renew',
      { tg_id: telegramId, subscription_id: subscriptionId, auto_renew: autoRenew },
      { auth: true },
    );
    return data;
  }

  // ── Cancel ─────────────────────────────────────────────────────────────

  async cancelSubscription(telegramId: number, subscriptionId: string): Promise<void> {    await this.request<unknown>(
      'POST',
      '/paypal/cancel',
      { tg_id: telegramId, subscription_id: subscriptionId },
      { auth: true },
    );
  }

  // ── Cancel scheduled downgrade ────────────────────────────────────────

  async cancelScheduledDowngrade(
    telegramId: number,
    subscriptionId: string,
    returnUrl: string,
    cancelUrl: string,
  ): Promise<{ approvalUrl: string | null; requiresApproval: boolean }> {
    return this.request<{ approvalUrl: string | null; requiresApproval: boolean }>(
      'POST',
      '/paypal/subscription/cancel-downgrade',
      {
        tg_id: telegramId,
        subscription_id: subscriptionId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
      { auth: true },
    );
  }

  // ── Resume (reactivate suspended) ─────────────────────────────────────

  async resumeSubscription(telegramId: number, subscriptionId: string): Promise<void> {
    await this.request<unknown>(
      'POST',
      '/paypal/subscription/resume',
      { tg_id: telegramId, subscription_id: subscriptionId },
      { auth: true },
    );
  }

  // ── Telegram Stars ─────────────────────────────────────────────────────

  /**
   * Creates a Telegram Stars invoice link for the given plan.
   * Returns { invoiceUrl, planName, starsAmount, priceUsd }.
   */
  async createStarsInvoice(telegramId: number, planName: string): Promise<{
    invoiceUrl: string;
    planName: string;
    starsAmount: number;
    priceUsd: number;
  }> {
    const idempotencyKey = this.idempotencyKey('stars-invoice', telegramId, planName);
    return this.request(
      'POST',
      '/telegram-payment/invoice/create',
      { tg_id: telegramId, plan_name: planName },
      { auth: true, idempotencyKey },
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    opts: { auth?: boolean; idempotencyKey?: string } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (opts.auth) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err: any) {
      this.logger.error(`[PaymentsClient] Network error ${method} ${path}: ${err?.message}`);
      throw new BadGatewayException('Payments service unavailable');
    }

    let responseBody: any;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = {};
    }

    if (!response.ok) {
      const msg: string = responseBody?.message || `HTTP ${response.status}`;
      this.logger.warn(`[PaymentsClient] ${method} ${path} → ${response.status}: ${msg}`);

      switch (response.status) {
        case 400:
          throw new BadRequestException(msg);
        case 401:
        case 403:
          throw new UnauthorizedException(msg);
        case 409:
          throw new ConflictException(msg);
        default:
          throw new BadGatewayException(`Payments service error: ${msg}`);
      }
    }

    return responseBody as T;
  }

  /**
   * Deterministic idempotency key based on operation + parameters.
   * Prevents duplicate requests if the mini app retries.
   */
  private idempotencyKey(...parts: (string | number)[]): string {
    return createHash('sha256')
      .update(parts.map(String).join(':'))
      .digest('hex')
      .slice(0, 32);
  }
}
