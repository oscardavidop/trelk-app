import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationPriority,
} from './schemas/notification.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

export interface CreateNotificationPayload {
  type: string;
  titleKey: string;
  messageKey: string;
  titleParams?: Record<string, unknown>;
  messageParams?: Record<string, unknown>;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  groupId?: string;
  link?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

const CACHE_TTL = 45; // seconds
const CACHE_PREFIX = 'notif:user:';
const BATCH_INTERVAL_MS = 15_000; // 15s batch window
const DEDUP_TTL = 300; // 5min dedup window
const DEDUP_PREFIX = 'notif:dedup:';

interface PendingNotification {
  userId: string;
  payload: CreateNotificationPayload;
}

@Injectable()
export class NotificationService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly batch: PendingNotification[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Notification.name) 
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly redis: RedisCacheService,
  ) {
    // Start batch processor
    this.batchTimer = setInterval(() => this.flushBatch(), BATCH_INTERVAL_MS);
  }

  async onModuleDestroy() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    await this.flushBatch(); // Flush remaining
  }

  async createNotification(
    userId: string,
    payload: CreateNotificationPayload,
  ): Promise<NotificationDocument> {
    const doc = await this.notificationModel.create({
      userId,
      type: payload.type,
      titleKey: payload.titleKey,
      messageKey: payload.messageKey,
      titleParams: payload.titleParams,
      messageParams: payload.messageParams,
      data: payload.data,
      priority: payload.priority || 'normal',
      groupId: payload.groupId,
      link: payload.link,
      read: false,
      createdAt: Date.now(),
    });

    await this.invalidateCache(userId);
    return doc;
  }

  async createBulkNotifications(
    userIds: string[],
    payload: CreateNotificationPayload,
  ): Promise<number> {
    if (!userIds.length) return 0;

    const now = Date.now();
    const docs = userIds.map((userId) => ({
      userId,
      type: payload.type,
      titleKey: payload.titleKey,
      messageKey: payload.messageKey,
      titleParams: payload.titleParams,
      messageParams: payload.messageParams,
      data: payload.data,
      priority: payload.priority || 'normal',
      groupId: payload.groupId,
      link: payload.link,
      read: false,
      createdAt: now,
    }));

    const result = await this.notificationModel.insertMany(docs, {
      ordered: false,
    });

    // Invalidate cache for all affected users
    await Promise.all(userIds.map((id) => this.invalidateCache(id)));
    return result.length;
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true, readAt: Date.now() } },
    );
    if (result.modifiedCount > 0) {
      await this.invalidateCache(userId);
      return true;
    }
    return false;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: Date.now() } },
    );
    if (result.modifiedCount > 0) {
      await this.invalidateCache(userId);
    }
    return result.modifiedCount;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
    });
    if (result.deletedCount > 0) {
      await this.invalidateCache(userId);
      return true;
    }
    return false;
  }

  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {},
  ) {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 20, 1), 50);
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}${userId}:list:${page}:${limit}:${filters.unreadOnly ? '1' : '0'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const query: Record<string, unknown> = { userId };
    if (filters.unreadOnly) query.read = false;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(query),
    ]);

    const result = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.redis.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `${CACHE_PREFIX}${userId}:count`;
    const cached = await this.redis.get<number>(cacheKey);
    if (cached !== null) return cached;

    const count = await this.notificationModel.countDocuments({
      userId,
      read: false,
    });

    await this.redis.set(cacheKey, count, CACHE_TTL);
    return count;
  }

  private async invalidateCache(userId: string): Promise<void> {
    try {
      // Delete known keys — count is always there
      await this.redis.del(`${CACHE_PREFIX}${userId}:count`);
      // Also update the SSE-friendly unread key
      const count = await this.notificationModel.countDocuments({ userId, read: false });
      await this.redis.set(`notif:unread:${userId}`, count, 60);
      // Best-effort invalidate first few pages
      for (let p = 1; p <= 3; p++) {
        for (const unread of ['0', '1']) {
          await this.redis.del(
            `${CACHE_PREFIX}${userId}:list:${p}:20:${unread}`,
          );
          await this.redis.del(
            `${CACHE_PREFIX}${userId}:list:${p}:50:${unread}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Cache invalidation failed for ${userId}: ${err}`);
    }
  }

  // ══════════════════════════════════════════
  // BATCHING — aggregate low-priority notifications
  // ══════════════════════════════════════════

  /**
   * Queue a notification for batched delivery.
   * High priority = immediate. Medium/Low = batched.
   */
  async queueNotification(userId: string, payload: CreateNotificationPayload): Promise<void> {
    // Deduplication check
    const dedupKey = `${DEDUP_PREFIX}${userId}:${payload.type}:${payload.groupId || ''}`;
    const isDuplicate = await this.redis.exists(dedupKey);
    if (isDuplicate) {
      this.logger.debug(`Dedup: skipping ${payload.type} for ${userId}`);
      return;
    }
    await this.redis.set(dedupKey, 1, DEDUP_TTL);

    if (payload.priority === 'high') {
      // High priority: deliver immediately
      await this.createNotification(userId, payload);
    } else {
      // Batch for later
      this.batch.push({ userId, payload });
    }
  }

  /** Flush all pending batched notifications to DB */
  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const items = this.batch.splice(0, this.batch.length);
    const now = Date.now();

    try {
      const docs = items.map(({ userId, payload }) => ({
        userId,
        type: payload.type,
        titleKey: payload.titleKey,
        messageKey: payload.messageKey,
        titleParams: payload.titleParams,
        messageParams: payload.messageParams,
        data: payload.data,
        priority: payload.priority || 'normal',
        groupId: payload.groupId,
        link: payload.link,
        read: false,
        createdAt: now,
      }));

      await this.notificationModel.insertMany(docs, { ordered: false });

      // Invalidate cache for affected users
      const userIds = [...new Set(items.map(i => i.userId))];
      await Promise.all(userIds.map(id => this.invalidateCache(id)));

      this.logger.debug(`Flushed ${items.length} batched notifications for ${userIds.length} users`);
    } catch (err) {
      this.logger.error(`Batch flush failed: ${(err as Error).message}`);
    }
  }
}
