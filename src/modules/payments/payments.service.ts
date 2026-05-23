import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppError, ErrorCode } from '../../common/errors';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { PaymentEvent, PaymentEventDocument } from './schemas/payment-event.schema';

// Fields safe to expose from eventBody — never send the raw body
const SAFE_EVENT_FIELDS = [
  'id', 'event_version', 'create_time', 'resource_type', 'event_type', 'summary',
];

const SAFE_RESOURCE_FIELDS = [
  'id', 'status', 'plan_id', 'quantity', 'start_time', 'create_time', 'update_time',
  'status_update_time', 'billing_info', 'shipping_amount',
];

const SENSITIVE_EVENT_TYPES = new Set([
  'BILLING.SUBSCRIPTION.CREATED',
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.DENIED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
]);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Subscription.name, 'payments')
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(PaymentEvent.name, 'payments')
    private readonly eventModel: Model<PaymentEventDocument>,
  ) {}

  // ════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════

  async getSummary(userId?: string) {
    const filter = userId ? { user_id: userId } : {};

    const activeSubscription = await this.subscriptionModel
      .findOne({ ...filter, status: 'ACTIVE' })
      .sort({ createdAt: -1 })
      .lean();

    const totalSubscriptions = await this.subscriptionModel.countDocuments(filter);

    // Total spent — aggregate from PAYMENT.SALE.COMPLETED events
    const subscriptionIds = await this.getSubscriptionIds(userId);
    const allLinkedIds = await this.getAllLinkedIds(subscriptionIds);

    const spentAgg = await this.eventModel.aggregate([
      {
        $match: {
          subscriptionId: { $in: allLinkedIds },
          eventType: 'PAYMENT.SALE.COMPLETED',
        },
      },
      {
        $group: {
          _id: '$eventBody.resource.amount.currency',
          total: { $sum: { $toDouble: '$eventBody.resource.amount.total' } },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      activeSubscription: activeSubscription
        ? this.sanitizeSubscription(activeSubscription)
        : null,
      totalSubscriptions,
      totalSpent: spentAgg.map((s) => ({
        currency: s._id || 'USD',
        total: Math.round(s.total * 100) / 100,
        count: s.count,
      })),
    };
  }

  // ════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ════════════════════════════════════════════════

  async getSubscriptions(userId?: string, cursor?: string, limit = 20) {
    const filter: any = userId ? { user_id: userId } : {};
    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const items = await this.subscriptionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items: items.map((s) => this.sanitizeSubscription(s)),
      nextCursor: hasMore && items.length ? String(items[items.length - 1]._id) : null,
      hasMore,
    };
  }

  async getSubscriptionDetail(userId: string | undefined, subscriptionId: string) {
    const filter: any = { paypal_subscription_id: subscriptionId };
    if (userId) filter.user_id = userId;
    const sub = await this.subscriptionModel.findOne(filter).lean();

    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    return this.sanitizeSubscription(sub);
  }

  // ════════════════════════════════════════════════
  // EVENTS FOR A SUBSCRIPTION
  // ════════════════════════════════════════════════

  async getSubscriptionEvents(userId: string | undefined, subscriptionId: string) {
    const filter: any = { paypal_subscription_id: subscriptionId };
    if (userId) filter.user_id = userId;
    const sub = await this.subscriptionModel.findOne(filter).lean();
    if (!sub) throw new AppError(ErrorCode.SUBSCRIPTION_NOT_FOUND, 'No access to this subscription', 403);

    // Events can have subscriptionId = paypal_subscription_id (for BILLING.*) 
    // or billing_agreement_id (for PAYMENT.SALE.*)
    const events = await this.eventModel
      .find({
        $or: [
          { subscriptionId: subscriptionId },
          { 'eventBody.resource.billing_agreement_id': subscriptionId },
        ],
      })
      .sort({ createdAt: 1 })
      .lean();

    return events.map((e) => this.sanitizeEvent(e));
  }

  // ════════════════════════════════════════════════
  // PAYMENT HISTORY (all events for user)
  // ════════════════════════════════════════════════

  async getHistory(userId?: string, cursor?: string, limit = 20, eventType?: string) {
    const subscriptionIds = await this.getSubscriptionIds(userId);
    const allLinkedIds = await this.getAllLinkedIds(subscriptionIds);

    // When no userId, show all events
    const filter: any = allLinkedIds.length
      ? {
          $or: [
            { subscriptionId: { $in: allLinkedIds } },
            { 'eventBody.resource.billing_agreement_id': { $in: subscriptionIds } },
          ],
        }
      : userId
        ? { _id: null } // user exists but has no subs → return empty
        : {}; // admin view → return all

    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    if (eventType) {
      filter.eventType = eventType;
    }

    const items = await this.eventModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items: items.map((e) => this.sanitizeEvent(e)),
      nextCursor: hasMore && items.length ? String(items[items.length - 1]._id) : null,
      hasMore,
    };
  }

  // ════════════════════════════════════════════════
  // CANCEL SUBSCRIPTION
  // ════════════════════════════════════════════════

  async cancelSubscription(userId: string | undefined, subscriptionId: string) {
    const filter: any = { paypal_subscription_id: subscriptionId };
    if (userId) filter.user_id = userId;
    const sub = await this.subscriptionModel.findOne(filter).lean();

    if (!sub) throw new AppError(ErrorCode.SUBSCRIPTION_NOT_FOUND, 'Subscription not found', 404);
    if (sub.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.SUBSCRIPTION_NOT_ACTIVE, 'Only active subscriptions can be cancelled', 403);
    }

    // Mark as cancelled locally — the webhook will confirm from PayPal
    await this.subscriptionModel.updateOne(
      { _id: sub._id },
      { $set: { status: 'CANCEL_PENDING' } },
    );

    // In production, you would also call PayPal API here:
    // POST https://api.paypal.com/v1/billing/subscriptions/{id}/cancel
    // For now we update local status and let webhooks handle it

    return { ok: true, message: 'Cancelación solicitada' };
  }

  // ════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════

  private async getSubscriptionIds(userId?: string): Promise<string[]> {
    const filter = userId ? { user_id: userId } : {};
    const subs = await this.subscriptionModel
      .find(filter)
      .select('paypal_subscription_id')
      .lean();
    return subs.map((s) => s.paypal_subscription_id);
  }

  /** 
   * Get all IDs that can appear in events' subscriptionId field.
   * For BILLING.* events, subscriptionId = paypal_subscription_id
   * For PAYMENT.SALE.* events, subscriptionId = sale transaction ID (not the subscription)
   * but the eventBody.resource.billing_agreement_id = paypal_subscription_id
   */
  private async getAllLinkedIds(subscriptionIds: string[]): Promise<string[]> {
    if (!subscriptionIds.length) return [];

    // Also find sale events that reference these subscriptions via billing_agreement_id
    const saleEvents = await this.eventModel
      .find({
        'eventBody.resource.billing_agreement_id': { $in: subscriptionIds },
        eventType: { $regex: /^PAYMENT\.SALE\./ },
      })
      .select('subscriptionId')
      .lean();

    const saleIds = saleEvents.map((e) => e.subscriptionId);
    return [...new Set([...subscriptionIds, ...saleIds])];
  }

  private sanitizeSubscription(sub: any) {
    const provider = sub.provider || 'paypal';
    const normalizedAmount = this.normalizeAmount(sub.amount, sub.currency, provider);

    return {
      _id: String(sub._id),
      paypal_subscription_id: sub.paypal_subscription_id,
      status: sub.status,
      plan_id: sub.plan_id,
      amount: normalizedAmount,
      currency: sub.currency,
      provider,
      telegram_charge_id: sub.telegram_charge_id ?? null,
      next_billing_date: sub.next_billing_date,
      start_time: sub.start_time,
      paypal_payerId: this.maskId(sub.paypal_payerId),
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  private normalizeAmount(amount: any, currency: string | undefined, provider: string): number {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n)) return 0;

    // Backward compatibility: early telegram_card records were stored in cents.
    if (provider === 'telegram_card' && (currency ?? '').toUpperCase() !== 'XTR' && n >= 100) {
      return Math.round((n / 100) * 100) / 100;
    }

    return Math.round(n * 100) / 100;
  }

  private sanitizeEvent(event: any) {
    const body = event.eventBody || {};
    const resource = body.resource || {};

    const sanitized: any = {
      _id: String(event._id),
      event_id: event.event_id,
      eventType: event.eventType,
      subscriptionId: event.subscriptionId,
      processed: event.processed,
      invalid_signature: event.invalid_signature,
      createdAt: event.createdAt,
      create_time: body.create_time,
      summary: body.summary,
    };

    // Extract key info based on event type
    if (event.eventType?.startsWith('BILLING.SUBSCRIPTION.')) {
      sanitized.resource = {
        id: resource.id,
        status: resource.status,
        plan_id: resource.plan_id,
        start_time: resource.start_time,
        status_update_time: resource.status_update_time,
      };

      if (resource.billing_info) {
        sanitized.billing_info = {
          outstanding_balance: resource.billing_info.outstanding_balance,
          last_payment: resource.billing_info.last_payment,
          next_billing_time: resource.billing_info.next_billing_time,
          failed_payments_count: resource.billing_info.failed_payments_count,
          cycle_executions: resource.billing_info.cycle_executions,
        };
      }

      if (resource.subscriber) {
        sanitized.subscriber = {
          name: resource.subscriber.name,
          payer_id: this.maskId(resource.subscriber.payer_id),
          email: this.maskEmail(resource.subscriber.email_address),
        };
      }
    }

    if (event.eventType?.startsWith('PAYMENT.SALE.')) {
      sanitized.resource = {
        id: resource.id,
        state: resource.state,
        billing_agreement_id: resource.billing_agreement_id,
        amount: resource.amount,
        transaction_fee: resource.transaction_fee,
        payment_mode: resource.payment_mode,
        create_time: resource.create_time,
      };
    }

    return sanitized;
  }

  private maskId(id?: string): string {
    if (!id || id.length < 6) return '****';
    return id.slice(0, 3) + '***' + id.slice(-3);
  }

  private maskEmail(email?: string): string {
    if (!email) return '****';
    const [local, domain] = email.split('@');
    if (!domain) return '****';
    const maskedLocal = local.slice(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  }
}
