import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly redis: RedisCacheService,
  ) {}

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
}
