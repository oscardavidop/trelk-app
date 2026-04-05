import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { AbuseRecord, AbuseRecordDocument } from './schemas/abuse-record.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const CACHE_TTL = 60; // 1min
const SHADOW_BAN_THRESHOLD = 50;
const BLOCK_THRESHOLD = 100;
const BLOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AbuseService {
  private readonly logger = new Logger(AbuseService.name);

  constructor(
    @InjectModel(AbuseRecord.name) private readonly abuseModel: Model<AbuseRecordDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  /** Get or create abuse record for a user */
  async getRecord(userId: string): Promise<AbuseRecordDocument> {
    const cacheKey = `abuse:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    let record = await this.abuseModel.findOne({ userId }).lean().exec();
    if (!record) {
      record = await this.abuseModel.create({
        userId,
        hashedIP: '',
        abuseScore: 0,
        firstSeen: Date.now(),
        lastActivity: Date.now(),
      });
    }

    await this.redis.set(cacheKey, record, CACHE_TTL);
    return record as unknown as AbuseRecordDocument;
  }

  /** Track an abuse event */
  async trackEvent(
    userId: string,
    eventType: 'spam' | 'rejected_review' | 'suspicious' | 'rate_limit',
    meta?: { ip?: string; userAgent?: string; fingerprint?: string },
  ): Promise<{ abuseScore: number; action: 'none' | 'shadow_ban' | 'block' }> {
    const update: any = {
      $inc: { abuseScore: this.getEventWeight(eventType) },
      $set: { lastActivity: Date.now() },
    };

    switch (eventType) {
      case 'spam':
        update.$inc.spamAttempts = 1;
        break;
      case 'rejected_review':
        update.$inc.rejectedReviews = 1;
        break;
      case 'suspicious':
        update.$inc.suspiciousPatterns = 1;
        break;
      case 'rate_limit':
        update.$inc.rateLimitHits = 1;
        break;
    }

    if (meta?.ip) {
      update.$set.hashedIP = this.hashIP(meta.ip);
    }
    if (meta?.userAgent) {
      update.$set.userAgent = meta.userAgent;
    }
    if (meta?.fingerprint) {
      update.$set.deviceFingerprint = meta.fingerprint;
    }

    const record = await this.abuseModel.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true },
    ).exec();

    await this.redis.del(`abuse:${userId}`);

    // Determine action
    let action: 'none' | 'shadow_ban' | 'block' = 'none';

    if (record.abuseScore >= BLOCK_THRESHOLD && !record.isBlocked) {
      await this.abuseModel.updateOne(
        { userId },
        { $set: { isBlocked: true, blockedUntil: Date.now() + BLOCK_DURATION_MS } },
      );
      action = 'block';
      this.logger.warn(`User ${userId} BLOCKED (score: ${record.abuseScore})`);
    } else if (record.abuseScore >= SHADOW_BAN_THRESHOLD && !record.isShadowBanned) {
      await this.abuseModel.updateOne(
        { userId },
        { $set: { isShadowBanned: true } },
      );
      action = 'shadow_ban';
      this.logger.warn(`User ${userId} SHADOW BANNED (score: ${record.abuseScore})`);
    }

    return { abuseScore: record.abuseScore, action };
  }

  /** Check if user is shadow banned (silently reduce impact) */
  async isShadowBanned(userId: string): Promise<boolean> {
    const record = await this.getRecord(userId);
    return record?.isShadowBanned === true;
  }

  /** Check if user is fully blocked */
  async isBlocked(userId: string): Promise<boolean> {
    const record = await this.getRecord(userId);
    if (!record?.isBlocked) return false;
    if (record.blockedUntil && record.blockedUntil < Date.now()) {
      // Unblock expired
      await this.abuseModel.updateOne(
        { userId },
        { $set: { isBlocked: false, blockedUntil: null, abuseScore: Math.max(0, record.abuseScore - 30) } },
      );
      await this.redis.del(`abuse:${userId}`);
      return false;
    }
    return true;
  }

  /** Get abuse metrics for admin dashboard */
  async getMetrics(): Promise<{
    totalRecords: number;
    shadowBanned: number;
    blocked: number;
    topAbusers: Array<{ userId: string; abuseScore: number }>;
  }> {
    const [totalRecords, shadowBanned, blocked, topAbusers] = await Promise.all([
      this.abuseModel.countDocuments().exec(),
      this.abuseModel.countDocuments({ isShadowBanned: true }).exec(),
      this.abuseModel.countDocuments({ isBlocked: true }).exec(),
      this.abuseModel
        .find({ abuseScore: { $gt: 10 } })
        .sort({ abuseScore: -1 })
        .limit(20)
        .select('userId abuseScore')
        .lean()
        .exec(),
    ]);

    return { totalRecords, shadowBanned, blocked, topAbusers };
  }

  private getEventWeight(type: string): number {
    switch (type) {
      case 'spam': return 10;
      case 'rejected_review': return 5;
      case 'suspicious': return 8;
      case 'rate_limit': return 2;
      default: return 1;
    }
  }

  private hashIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}
