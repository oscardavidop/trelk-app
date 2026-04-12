import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { createHmac, timingSafeEqual } from 'crypto';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { UserModeration, UserModerationDocument } from './schemas/user-moderation.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { NotificationEventBus } from '../notifications/notification-event-bus';
import { CacheInvalidationService } from '../../core/resilience/cache-invalidation.service';

// ── Types ──────────────────────────────────────────

export interface ModerationJobData {
  reviewId: string;
  content: string;
  userId: number;
  command: string;
}

export interface ModerationResult {
  status: 'approved' | 'rejected';
  moderationScore: number;
  moderationReasons: string[];
  isFlagged: boolean;
  policies: Record<string, { probability: number; flagged: boolean }>;
}

export interface ModerationMetrics {
  totalModerated: number;
  totalRejected: number;
  totalFlagged: number;
  blockedUsers: number;
  topReasons: Record<string, number>;
}

// ── Pre-moderation detector types ──────────────────

interface PreModerationFlag {
  type: string;
  score: number;
  reason: string;
}

// ── Service ──────────────────────────────────────────

@Injectable()
export class ReviewModerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReviewModerationService.name);
  private queue: Queue | null = null;
  private reportQueue: Queue | null = null;
  private aiSummaryQueue: Queue | null = null;

  private readonly enabled: boolean;
  private readonly webhookSecret: string;
  private readonly thresholdReject: number;
  private readonly thresholdReview: number;
  private readonly maxRejected: number;
  private readonly blockDays: number;
  private readonly botToken: string;
  private readonly adminChatId: string;
  private readonly apiUrl: string;

  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(UserModeration.name) private readonly userModModel: Model<UserModerationDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
    private readonly notificationEventBus: NotificationEventBus,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {
    this.enabled = this.configService.get<boolean>('MODERATION_ENABLED', false);
    this.webhookSecret = this.configService.get<string>('MODAPI_WEBHOOK_SECRET', '');
    this.thresholdReject = this.configService.get<number>('MODERATION_THRESHOLD_REJECT', 0.8);
    this.thresholdReview = this.configService.get<number>('MODERATION_THRESHOLD_REVIEW', 0.5);
    this.maxRejected = this.configService.get<number>('MAX_REJECTED_REVIEWS', 5);
    this.blockDays = this.configService.get<number>('USER_BLOCK_DAYS', 7);
    this.botToken = this.configService.get<string>('BOT_TOKEN', '');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID', '');
    this.apiUrl = this.configService.get<string>('TELEGRAM_API_URL') || 'https://api.telegram.org';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Moderation system DISABLED');
      return;
    }

    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '') || undefined;
      const redisTls = this.configService.get<string>('REDIS_TLS') === 'true';

      this.queue = new Queue('moderation', {
        connection: { url: this.configService.get<string>('REDIS_URL'), host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null, tls: redisTls ? {} : undefined },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });

      this.logger.log('Moderation queue initialized');

      // Report dispatch queue
      this.reportQueue = new Queue('process-report', {
        connection: { url: this.configService.get<string>('REDIS_URL'), host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null, tls: redisTls ? {} : undefined },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });

      this.logger.log('Report dispatch queue initialized');

      // AI summary queue
      this.aiSummaryQueue = new Queue('ai-review-summary', {
        connection: { url: this.configService.get<string>('REDIS_URL'), host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null, tls: redisTls ? {} : undefined },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 100 },
        },
      });

      this.logger.log('AI summary queue initialized');
    } catch (err) {
      this.logger.error(`Failed to init queues: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.queue) await this.queue.close().catch(() => {});
    if (this.reportQueue) await this.reportQueue.close().catch(() => {});
    if (this.aiSummaryQueue) await this.aiSummaryQueue.close().catch(() => {});
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async enqueueModeration(data: ModerationJobData): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Moderation queue not available, auto-approving');
      await this.ratingModel.updateOne(
        { _id: data.reviewId },
        { $set: { status: 'approved' } },
      ).exec();
      return;
    }

    try {
      const jobId = `review_${data.reviewId}`;
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        await existing.remove().catch(() => {});
      }
      await this.queue.add('moderate-review', data, { jobId });
    } catch (err) {
      this.logger.error(`Failed to enqueue moderation job: ${(err as Error).message}`);
      await this.ratingModel.updateOne(
        { _id: data.reviewId },
        { $set: { status: 'approved' } },
      ).exec();
    }
  }

  async enqueueReport(reportId: string): Promise<void> {
    if (!this.reportQueue) {
      this.logger.warn('Report queue not available, skipping dispatch');
      return;
    }
    try {
      await this.reportQueue.add('dispatch-report', { reportId }, {
        jobId: `report_${reportId}`,
      });
    } catch (err) {
      this.logger.error(`Failed to enqueue report job: ${(err as Error).message}`);
    }
  }

  async enqueueAISummary(commandSlug: string): Promise<void> {
    if (!this.aiSummaryQueue) {
      this.logger.debug('AI summary queue not available, skipping');
      return;
    }
    try {
      const jobId = `summary_${commandSlug}`;
      const existing = await this.aiSummaryQueue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'active' || state === 'waiting' || state === 'delayed') return;
        await existing.remove().catch(() => {});
      }
      await this.aiSummaryQueue.add('generate-summary', { commandSlug }, {
        jobId,
        delay: 5000,
      });
    } catch (err) {
      this.logger.warn(`Failed to enqueue AI summary: ${(err as Error).message}`);
    }
  }

  async cancelJob(reviewId: string): Promise<void> {
    if (!this.queue) return;
    try {
      const job = await this.queue.getJob(`review_${reviewId}`);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled moderation job for review ${reviewId}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to cancel moderation job for ${reviewId}: ${(err as Error).message}`);
    }
  }

  async isUserBlocked(userId: number): Promise<boolean> {
    if (!this.enabled) return false;

    const cacheKey = `mod:blocked:${userId}`;
    const cached = await this.redis.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    const userMod = await this.userModModel.findOne({ userId }).lean().exec();
    if (!userMod) {
      await this.redis.set(cacheKey, false, 300);
      return false;
    }

    if (userMod.isBlocked && userMod.blockedUntil) {
      if (Date.now() < userMod.blockedUntil) {
        await this.redis.set(cacheKey, true, 300);
        return true;
      }
      await this.userModModel.updateOne(
        { userId },
        { $set: { isBlocked: false, blockedUntil: null, rejectedCount: 0, updatedAt: Date.now() } },
      ).exec();
    }

    await this.redis.set(cacheKey, false, 300);
    return false;
  }

  async applyModerationResult(reviewId: string, result: ModerationResult): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) return;

    const oid = new Types.ObjectId(reviewId);
    const doc = await this.ratingModel.findById(oid).lean().exec();
    if (!doc) return;

    await this.ratingModel.updateOne(
      { _id: oid },
      {
        $set: {
          status: result.status,
          moderationScore: result.moderationScore,
          moderationReasons: result.moderationReasons,
          isFlagged: result.isFlagged,
          moderationMeta: result.policies,
          isAIModerated: true,
          updatedAt: Date.now(),
        },
      },
    ).exec();

    const cmd = (doc as any).command;
    if (cmd) {
      await this.cacheInvalidation.emit({ type: 'moderation_complete', command: cmd, userId: (doc as any).userId });
    }

    if (result.status === 'rejected') {
      await this.incrementUserStrike((doc as any).userId);
    }

    if (result.status === 'rejected') {
      this.notifyUserRejection((doc as any).userId, result.moderationReasons).catch(() => {});
      this.notificationEventBus.emit('review.rejected', {
        userId: String((doc as any).userId),
        command: cmd,
        reviewId,
      }).catch(() => {});
    }

    if (result.status === 'approved') {
      this.notificationEventBus.emit('review.approved', {
        userId: String((doc as any).userId),
        command: cmd,
        reviewId,
      }).catch(() => {});
    }
  }

  async incrementUserStrike(userId: number): Promise<void> {
    const now = Date.now();

    const userMod = await this.userModModel.findOneAndUpdate(
      { userId },
      {
        $inc: { rejectedCount: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { flaggedCount: 0, isBlocked: false, blockedUntil: null, createdAt: now },
      },
      { upsert: true, new: true },
    ).exec();

    if (userMod.rejectedCount >= this.maxRejected && !userMod.isBlocked) {
      const blockedUntil = now + (this.blockDays * 24 * 60 * 60 * 1000);

      await this.userModModel.updateOne(
        { userId },
        { $set: { isBlocked: true, blockedUntil, updatedAt: now } },
      ).exec();

      await this.cacheInvalidation.emit({ type: 'user_blocked', userId });
      this.notifyUserBlocked(userId).catch(() => {});
      this.notifyAdminBlock(userId, userMod.rejectedCount).catch(() => {});
    }
  }

  async incrementFlagCount(userId: number): Promise<void> {
    await this.userModModel.findOneAndUpdate(
      { userId },
      {
        $inc: { flaggedCount: 1 },
        $set: { updatedAt: Date.now() },
        $setOnInsert: { rejectedCount: 0, isBlocked: false, blockedUntil: null, createdAt: Date.now() },
      },
      { upsert: true },
    ).exec();
  }

  detectPreModFlags(content: string): PreModerationFlag[] {
    const flags: PreModerationFlag[] = [];
    if (!content) return flags;

    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlRegex) || [];
    if (urls.length >= 3) {
      flags.push({ type: 'spam_links', score: 0.8, reason: 'Multiple URLs detected' });
    }
    const uniqueUrls = new Set(urls.map(u => u.toLowerCase()));
    if (urls.length > 1 && uniqueUrls.size === 1) {
      flags.push({ type: 'repeated_links', score: 0.9, reason: 'Repeated identical URL' });
    }

    const spoofRanges = [
      /[\u0400-\u04FF]/,
      /[\u0370-\u03FF]/,
      /[\uFF00-\uFFEF]/,
    ];
    const hasLatin = /[a-zA-Z]/.test(content);
    const hasSpoofChars = spoofRanges.some(r => r.test(content));
    if (hasLatin && hasSpoofChars) {
      flags.push({ type: 'unicode_spoofing', score: 0.7, reason: 'Mixed script characters (possible spoofing)' });
    }

    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = content.match(emojiRegex) || [];
    if (emojis.length > 10) {
      flags.push({ type: 'emoji_spam', score: 0.6, reason: 'Excessive emoji usage' });
    }

    if (/(.)\1{6,}/.test(content)) {
      flags.push({ type: 'repetitive_chars', score: 0.5, reason: 'Repetitive characters' });
    }

    const alphaOnly = content.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '');
    if (alphaOnly.length > 20 && alphaOnly === alphaOnly.toUpperCase()) {
      flags.push({ type: 'all_caps', score: 0.3, reason: 'All caps text' });
    }

    return flags;
  }

  async getPendingReviews(limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const [items, total] = await Promise.all([
      this.ratingModel
        .find({ status: 'pending', review: { $exists: true, $ne: '' } })
        .sort({ createdAt: -1 })
        .skip(Math.max(offset, 0))
        .limit(safeLimit)
        .lean()
        .exec(),
      this.ratingModel.countDocuments({ status: 'pending', review: { $exists: true, $ne: '' } }).exec(),
    ]);

    return {
      items: items.map(r => ({
        id: (r as any)._id.toString(),
        userId: r.userId,
        command: r.command,
        rating: r.rating,
        review: (r as any).review,
        status: (r as any).status,
        moderationScore: (r as any).moderationScore,
        moderationReasons: (r as any).moderationReasons || [],
        isFlagged: (r as any).isFlagged || false,
        createdAt: r.createdAt,
      })),
      total,
      hasMore: Math.max(offset, 0) + items.length < total,
    };
  }

  async getRejectedReviews(limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const [items, total] = await Promise.all([
      this.ratingModel
        .find({ status: 'rejected', review: { $exists: true, $ne: '' } })
        .sort({ updatedAt: -1 })
        .skip(Math.max(offset, 0))
        .limit(safeLimit)
        .lean()
        .exec(),
      this.ratingModel.countDocuments({ status: 'rejected', review: { $exists: true, $ne: '' } }).exec(),
    ]);

    return {
      items: items.map(r => ({
        id: (r as any)._id.toString(),
        userId: r.userId,
        command: r.command,
        rating: r.rating,
        review: (r as any).review,
        status: (r as any).status,
        moderationScore: (r as any).moderationScore,
        moderationReasons: (r as any).moderationReasons || [],
        isFlagged: (r as any).isFlagged || false,
        createdAt: r.createdAt,
      })),
      total,
      hasMore: Math.max(offset, 0) + items.length < total,
    };
  }

  async manualApprove(reviewId: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) return;
    const oid = new Types.ObjectId(reviewId);

    const doc = await this.ratingModel.findById(oid).lean().exec();
    if (!doc) return;

    await this.ratingModel.updateOne(
      { _id: oid },
      { $set: { status: 'approved', updatedAt: Date.now() } },
    ).exec();

    const cmd = (doc as any).command;
    if (cmd) {
      await this.cacheInvalidation.emit({ type: 'moderation_manual', command: cmd });
    }
  }

  async manualReject(reviewId: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) return;
    const oid = new Types.ObjectId(reviewId);

    const doc = await this.ratingModel.findById(oid).lean().exec();
    if (!doc) return;

    await this.ratingModel.updateOne(
      { _id: oid },
      { $set: { status: 'rejected', moderationReasons: ['manual_reject'], updatedAt: Date.now() } },
    ).exec();

    await this.incrementUserStrike((doc as any).userId);

    const cmd = (doc as any).command;
    if (cmd) {
      await this.cacheInvalidation.emit({ type: 'moderation_manual', command: cmd });
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    try {
      const expected = createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length) return false;
      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  async getMetrics(): Promise<ModerationMetrics> {
    const cacheKey = 'mod:metrics';
    const cached = await this.redis.get<ModerationMetrics>(cacheKey);
    if (cached) return cached;

    const [totalModerated, totalRejected, totalFlagged, blockedUsers, reasonsAgg] = await Promise.all([
      this.ratingModel.countDocuments({ status: { $in: ['approved', 'rejected'] }, moderationScore: { $ne: null } }).exec(),
      this.ratingModel.countDocuments({ status: 'rejected' }).exec(),
      this.ratingModel.countDocuments({ isFlagged: true }).exec(),
      this.userModModel.countDocuments({ isBlocked: true }).exec(),
      this.ratingModel.aggregate([
        { $match: { status: 'rejected', moderationReasons: { $exists: true, $ne: [] } } },
        { $unwind: '$moderationReasons' },
        { $group: { _id: '$moderationReasons', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec(),
    ]);

    const topReasons: Record<string, number> = {};
    for (const r of reasonsAgg) {
      topReasons[r._id] = r.count;
    }

    const result: ModerationMetrics = { totalModerated, totalRejected, totalFlagged, blockedUsers, topReasons };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  public async getReviewModerationStatus(reviewId: string): Promise<string> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) return 'unknown';
    const oid = new Types.ObjectId(reviewId);
    const doc = await this.ratingModel.findById(oid, { status: 1 }).lean().exec();
    if (!doc) return 'unknown';
    return (doc as any).status || 'unknown';
  }

  private static readonly TOS_URL = 'https://trelkbot.com/terms';

  private static readonly REASON_TO_ENGLISH: Record<string, string> = {
    toxicity: 'toxic or offensive language',
    profanity: 'excessive profanity',
    spam: 'spam content',
    hate: 'hate speech',
    violence: 'violent or threatening content',
    self_harm: 'harmful content',
    severity_reject: 'severe policy violation',
    manual_reject: 'manual review by moderator',
  };

  private humanizeReasons(reasons: string[]): string[] {
    return reasons.map(r => ReviewModerationService.REASON_TO_ENGLISH[r] || r);
  }

  private async notifyUserRejection(userId: number, reasons: string[]): Promise<void> {
    if (!this.botToken) return;

    const humanReasons = this.humanizeReasons(reasons);
    const reasonList = humanReasons.length > 0
      ? humanReasons.map(r => `  • ${r}`).join('\n')
      : '  • policy violation';

    const lines = [
      `⚠️ Your review was not approved.`,
      ``,
      `Your comment does not comply with our healthy comments policy:`,
      reasonList,
      ``,
      `Please keep your reviews respectful and constructive.`,
      `⚡ Warning: Repeated violations may result in a temporary restriction on posting reviews.`,
      ``,
      `📋 Terms of Service: ${ReviewModerationService.TOS_URL}`,
    ];

    await this.sendTelegramMessage(userId, lines.join('\n'));
  }

  private async notifyUserBlocked(userId: number): Promise<void> {
    if (!this.botToken) return;

    const lines = [
      `🚫 Your account has been temporarily restricted from posting reviews.`,
      ``,
      `Due to repeated policy violations, your review privileges have been suspended for ${this.blockDays} days.`,
      ``,
      `If you believe this is an error, please contact support.`,
      `📋 Terms of Service: ${ReviewModerationService.TOS_URL}`,
    ];

    await this.sendTelegramMessage(userId, lines.join('\n'));
  }

  private async notifyAdminBlock(userId: number, rejectedCount: number): Promise<void> {
    if (!this.botToken || !this.adminChatId) return;

    const text = [
      `🚨 *User blocked by moderation*`,
      ``,
      `*User ID:* ${userId}`,
      `*Rejected reviews:* ${rejectedCount}`,
      `*Duration:* ${this.blockDays} days`,
    ].join('\n');

    try {
      await fetch(`${this.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.adminChatId, text, parse_mode: 'Markdown' }),
      });
    } catch (err) {
      this.logger.warn(`Failed to notify admin: ${(err as Error).message}`);
    }
  }

  private async sendTelegramMessage(chatId: number, text: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } catch (err) {
      this.logger.warn(`Failed to send Telegram message to ${chatId}: ${(err as Error).message}`);
    }
  }
}
