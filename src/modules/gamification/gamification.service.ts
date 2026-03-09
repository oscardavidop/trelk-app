import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserGamification, UserGamificationDocument } from './schemas/user-gamification.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_MAP,
  levelFromXP,
  type AchievementDefinition,
} from './achievements.config';

const CACHE_PREFIX = 'user:gamification:';
const CACHE_TTL = 60;

@Injectable()
export class GamificationService {
  constructor(
    @InjectModel(UserGamification.name)
    private readonly model: Model<UserGamificationDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  /**
   * GET /api/v1/ui/gamification
   * Returns merged achievement definitions + user progress, level info, streak.
   */
  async getProfile(userId: number): Promise<GamificationProfile> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    const cached = await this.redis.get<GamificationProfile>(cacheKey);
    if (cached) return cached;

    const doc = await this.model.findOne({ userId }).lean().exec();

    const xp = doc?.xp ?? 0;
    const streak = doc?.streak ?? 0;
    const lvl = levelFromXP(xp);

    const achievements = ACHIEVEMENT_DEFINITIONS.map(def => {
      const userAch = doc?.achievements?.find(a => a.id === def.id);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        goal: def.goal,
        rewardXP: def.rewardXP,
        rewardLabel: def.rewardLabel,
        category: def.category,
        resetInterval: def.resetInterval,
        progress: userAch?.progress ?? 0,
        unlocked: userAch?.unlocked ?? false,
        unlockedAt: userAch?.unlockedAt,
      };
    });

    const profile: GamificationProfile = {
      xp,
      streak,
      level: lvl.level,
      currentLevelXP: lvl.currentXP,
      nextLevelXP: lvl.nextXP,
      levelProgress: lvl.progress,
      achievements,
    };

    await this.redis.set(cacheKey, profile, CACHE_TTL);
    return profile;
  }

  /**
   * GET /api/v1/ui/gamification/achievements?filter=all|unlocked|pending
   */
  async getAchievements(userId: number, filter: string): Promise<MergedAchievement[]> {
    const profile = await this.getProfile(userId);
    if (filter === 'unlocked') return profile.achievements.filter(a => a.unlocked);
    if (filter === 'pending') return profile.achievements.filter(a => !a.unlocked);
    return profile.achievements;
  }

  /**
   * GET /api/v1/ui/gamification/rankings?limit=10
   * Top users by XP
   */
  async getRankings(limit: number): Promise<RankingEntry[]> {
    const cacheKey = 'gamification:rankings';
    const cached = await this.redis.get<RankingEntry[]>(cacheKey);
    if (cached) return cached;

    const docs = await this.model
      .find()
      .sort({ xp: -1 })
      .limit(Math.min(limit, 50))
      .select('userId xp streak')
      .lean()
      .exec();

    const rankings: RankingEntry[] = docs.map((d, i) => ({
      rank: i + 1,
      userId: d.userId,
      xp: d.xp,
      level: levelFromXP(d.xp).level,
      streak: d.streak,
    }));

    await this.redis.set(cacheKey, rankings, 120);
    return rankings;
  }
}

export interface MergedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  rewardXP: number;
  rewardLabel: string;
  category?: string;
  resetInterval?: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GamificationProfile {
  xp: number;
  streak: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  levelProgress: number;
  achievements: MergedAchievement[];
}

export interface RankingEntry {
  rank: number;
  userId: number;
  xp: number;
  level: number;
  streak: number;
}
