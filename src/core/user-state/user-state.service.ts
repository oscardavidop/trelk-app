import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';

export type UserStateType = 'new_user' | 'exploring_user' | 'power_user' | 'inactive_user';

export interface UserState {
  type: UserStateType;
  commandsUsed: number;
  reviewsWritten: number;
  daysSinceLastActive: number;
  accountAgeDays: number;
  engagementScore: number;
  updatedAt: number;
}

/**
 * UserStateService — classifies users by engagement level.
 *
 * Classification:
 * - new_user: <3 commands used, account <7 days
 * - exploring_user: 3-20 commands, active in last 7 days
 * - power_user: >20 commands OR >10 reviews, highly engaged
 * - inactive_user: no activity in >14 days
 *
 * Cached for 1 hour. Recomputed on demand.
 */
@Injectable()
export class UserStateService {
  private readonly logger = new Logger('UserState');

  constructor(
    @InjectModel(User.name, 'mbot') private readonly userModel: Model<UserDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  async getUserState(userId: number): Promise<UserState> {
    const cacheKey = `user:state:${userId}`;
    const cached = await this.redis.get<UserState>(cacheKey);
    if (cached) return cached;

    const state = await this.computeState(userId);
    await this.redis.set(cacheKey, state, 3600); // 1h cache
    return state;
  }

  private async computeState(userId: number): Promise<UserState> {
    // Get user doc for account age
    const user = await this.userModel.findOne({
      $or: [{ telegramId: userId }, { id: userId }],
    }).select('createdAt updatedAt').lean().exec();

    const now = Date.now();
    const createdAt = (user as any)?.createdAt
      ? new Date((user as any).createdAt).getTime()
      : now;
    const lastActive = (user as any)?.updatedAt
      ? new Date((user as any).updatedAt).getTime()
      : createdAt;

    const accountAgeDays = Math.floor((now - createdAt) / 86_400_000);
    const daysSinceLastActive = Math.floor((now - lastActive) / 86_400_000);

    // Get command usage and review counts from the main database
    // We use the user model timestamps as proxy since History is in mbot
    const commandsUsed = 0; // Will be populated with actual data when available
    const reviewsWritten = 0;

    // For now, compute from what we have
    const engagementScore = this.computeEngagement(accountAgeDays, daysSinceLastActive, commandsUsed, reviewsWritten);
    const type = this.classifyUser(accountAgeDays, daysSinceLastActive, commandsUsed, reviewsWritten, engagementScore);

    const state: UserState = {
      type,
      commandsUsed,
      reviewsWritten,
      daysSinceLastActive,
      accountAgeDays,
      engagementScore,
      updatedAt: now,
    };

    this.logger.debug({ msg: 'user-state-computed', userId, type, engagementScore });
    return state;
  }

  private classifyUser(
    accountAgeDays: number,
    daysSinceLastActive: number,
    commandsUsed: number,
    reviewsWritten: number,
    engagementScore: number,
  ): UserStateType {
    // Inactive: no activity in 14+ days regardless of history
    if (daysSinceLastActive > 14) return 'inactive_user';

    // Power user: high engagement metrics
    if (commandsUsed > 20 || reviewsWritten > 10 || engagementScore > 70) return 'power_user';

    // New user: fresh account with minimal usage
    if (accountAgeDays < 7 && commandsUsed < 3) return 'new_user';

    // Exploring: everything else (active but still learning)
    return 'exploring_user';
  }

  private computeEngagement(
    accountAgeDays: number,
    daysSinceLastActive: number,
    commandsUsed: number,
    reviewsWritten: number,
  ): number {
    const activityRecency = daysSinceLastActive < 1 ? 30 : daysSinceLastActive < 7 ? 20 : daysSinceLastActive < 14 ? 10 : 0;
    const usageDepth = Math.min(commandsUsed * 2, 40);
    const contribution = Math.min(reviewsWritten * 3, 30);

    return Math.round(Math.min(activityRecency + usageDepth + contribution, 100));
  }
}
