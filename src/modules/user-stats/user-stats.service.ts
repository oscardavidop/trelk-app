import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { Badge } from '../../common/types/command-stats.types';

@Injectable()
export class UserStatsService {
  private readonly logger = new Logger(UserStatsService.name);
  readonly adminIds: Set<number>;

  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
  ) {
    const adminIdsStr = this.configService.get<string>('ADMIN_IDS', '');
    this.adminIds = new Set(adminIdsStr.split(',').map(Number).filter(Boolean));
  }

  checkIsAdmin(userId: number): boolean {
    return this.adminIds.has(userId);
  }

  async getUserInfoBatch(userIds: number[]): Promise<Map<number, { firstName: string; lastName?: string; username?: string; photoUrl?: string }>> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map();

    const users = await this.userModel
      .find({ $or: [{ telegramId: { $in: unique } }, { id: { $in: unique } }] })
      .select('telegramId id firstName lastName username photoUrl')
      .lean()
      .exec();

    const map = new Map<number, { firstName: string; lastName?: string; username?: string; photoUrl?: string }>();
    for (const u of users) {
      const key = u.telegramId ?? (u as any).id;
      if (key) map.set(key, { firstName: u.firstName, lastName: u.lastName, username: u.username, photoUrl: u.photoUrl });
    }
    return map;
  }

  async computeTrustScore(userId: number): Promise<{ score: number; badge: Badge }> {
    const cacheKey = `trust:score:${userId}`;
    const cached = await this.redis.get<{ score: number; badge: Badge }>(cacheKey);
    if (cached) return cached;

    const [totalCommandsUsed, totalReviews, user] = await Promise.all([
      this.historyModel.countDocuments({ userId, type: 'command' }).exec(),
      this.ratingModel.countDocuments({ userId, rating: { $gte: 1 } }).exec(),
      this.userModel.findOne({ $or: [{ telegramId: userId }, { id: userId }] }).select('createdAt').lean().exec(),
    ]);

    const accountAgeDays = (user as any)?.createdAt
      ? Math.floor((Date.now() - new Date((user as any).createdAt).getTime()) / 86400000)
      : 0;

    const raw =
      Math.log(totalCommandsUsed + 1) * 20 +
      Math.log(totalReviews + 1) * 10 +
      Math.min(accountAgeDays / 30, 10) * 5;

    const score = Math.round(Math.min(Math.max(raw, 0), 100));
    const badge: Badge = score > 70 ? 'power_user' : score > 40 ? 'active_user' : 'new_user';

    const result = { score, badge };
    await this.redis.set(cacheKey, result, 3600); // 1h cache
    return result;
  }
}
