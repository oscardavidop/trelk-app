import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History } from '../history/schemas/history.schema';
import { CommandFavorite } from '../command-favorites/schemas/command-favorite.schema';
import { BOT_COMMANDS } from '../../data/bot-commands';
import { RedisCacheService } from '../redis/redis-cache.service';

export interface PersonalizedItem {
  command: string;
  name: string;
  category: string;
  description: string;
  reason: string; // 'because_you_used' | 'popular_in_category' | 'trending' | 'new' | 'users_like_you'
  score: number;
}

export interface PersonalizationResponse {
  forYou: PersonalizedItem[];
  continueUsing: PersonalizedItem[];
  basedOnHistory: PersonalizedItem[];
  discover: PersonalizedItem[];
}

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(
    @InjectModel(History.name, 'mbot') private readonly historyModel: Model<any>,
    @InjectModel(CommandFavorite.name) private readonly favModel: Model<any>,
    private readonly redis: RedisCacheService,
  ) {}

  async getPersonalized(userId: number): Promise<PersonalizationResponse> {
    const cacheKey = `personalization:${userId}`;
    const cached = await this.redis.get<PersonalizationResponse>(cacheKey);
    if (cached) return cached;

    const [userCommands, userFavorites, globalPopular, recentTrending] = await Promise.all([
      this.getUserTopCommands(userId),
      this.getUserFavorites(userId),
      this.getGlobalPopular(),
      this.getRecentTrending(),
    ]);

    const userCategories = this.inferCategories(userCommands);
    const usedSet = new Set(userCommands.map(c => c.command));
    const favSet = new Set(userFavorites);

    // ── "Continue Using" — recent commands user hasn't used in last 24h ──
    const continueUsing = userCommands
      .slice(0, 8)
      .map(c => this.enrichCommand(c.command, 'because_you_used', c.count))
      .filter(Boolean) as PersonalizedItem[];

    // ── "For You" — popular in user's preferred categories, not yet used ──
    const forYou: PersonalizedItem[] = [];
    for (const cmd of BOT_COMMANDS) {
      if (usedSet.has(cmd.uniqueName)) continue;
      const cat = cmd.category || 'uncategorized';
      if (userCategories.has(cat)) {
        const item = this.enrichCommand(cmd.uniqueName, 'popular_in_category', 50);
        if (item) forYou.push(item);
      }
    }
    // Add trending not yet used
    for (const trending of recentTrending) {
      if (!usedSet.has(trending) && !forYou.some(f => f.command === trending)) {
        const item = this.enrichCommand(trending, 'trending', 40);
        if (item) forYou.push(item);
      }
    }
    forYou.sort((a, b) => b.score - a.score);

    // ── "Based on your history" — collaborative: users who used X also used Y ──
    const basedOnHistory = await this.getCollaborativeRecommendations(userId, usedSet);

    // ── "Discover" — commands user hasn't used and aren't in their categories ──
    const discover: PersonalizedItem[] = [];
    for (const cmd of BOT_COMMANDS) {
      if (usedSet.has(cmd.uniqueName)) continue;
      if (favSet.has(cmd.uniqueName)) continue;
      const cat = cmd.category || 'uncategorized';
      if (!userCategories.has(cat)) {
        const item = this.enrichCommand(cmd.uniqueName, 'new', 20);
        if (item) discover.push(item);
      }
    }
    // Shuffle discover for variety
    for (let i = discover.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [discover[i], discover[j]] = [discover[j], discover[i]];
    }

    const result: PersonalizationResponse = {
      forYou: forYou.slice(0, 10),
      continueUsing: continueUsing.slice(0, 6),
      basedOnHistory: basedOnHistory.slice(0, 8),
      discover: discover.slice(0, 8),
    };

    await this.redis.set(cacheKey, result, 300); // 5 min cache
    return result;
  }

  // ── Data fetching ──

  private async getUserTopCommands(userId: number): Promise<{ command: string; count: number }[]> {
    try {
      return await this.historyModel.aggregate([
        { $match: { userId, type: 'command', timestamp: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 } } },
        { $group: { _id: '$command', count: { $sum: 1 }, lastUsed: { $max: '$timestamp' } } },
        { $sort: { lastUsed: -1, count: -1 } },
        { $limit: 20 },
        { $project: { _id: 0, command: '$_id', count: 1 } },
      ]).exec();
    } catch {
      return [];
    }
  }

  private async getUserFavorites(userId: number): Promise<string[]> {
    try {
      const favs = await this.favModel.find({ userId }).select('command').lean().exec();
      return favs.map((f: any) => f.command);
    } catch {
      return [];
    }
  }

  private async getGlobalPopular(): Promise<string[]> {
    const key = 'personalization:global_popular';
    const cached = await this.redis.get<string[]>(key);
    if (cached) return cached;

    try {
      const results = await this.historyModel.aggregate([
        { $match: { type: 'command', timestamp: { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).exec();
      const popular = results.map((r: any) => r._id);
      await this.redis.set(key, popular, 600);
      return popular;
    } catch {
      return [];
    }
  }

  private async getRecentTrending(): Promise<string[]> {
    const key = 'personalization:trending';
    const cached = await this.redis.get<string[]>(key);
    if (cached) return cached;

    try {
      const results = await this.historyModel.aggregate([
        { $match: { type: 'command', timestamp: { $gte: Date.now() - 24 * 60 * 60 * 1000 } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec();
      const trending = results.map((r: any) => r._id);
      await this.redis.set(key, trending, 300);
      return trending;
    } catch {
      return [];
    }
  }

  /** Simple collaborative filtering: users who used same commands also used... */
  private async getCollaborativeRecommendations(
    userId: number,
    usedSet: Set<string>,
  ): Promise<PersonalizedItem[]> {
    try {
      // Find similar users (shared ≥3 commands in last 30d)
      const userCmds = [...usedSet].slice(0, 10);
      if (userCmds.length < 2) return [];

      const similarUsers = await this.historyModel.aggregate([
        { $match: { type: 'command', command: { $in: userCmds }, userId: { $ne: userId } } },
        { $group: { _id: '$userId', sharedCommands: { $addToSet: '$command' } } },
        { $addFields: { sharedCount: { $size: '$sharedCommands' } } },
        { $match: { sharedCount: { $gte: 2 } } },
        { $sort: { sharedCount: -1 } },
        { $limit: 50 },
      ]).exec();

      if (!similarUsers.length) return [];

      const similarUserIds = similarUsers.map((u: any) => u._id);

      // Get commands those similar users used that current user hasn't
      const recommendations = await this.historyModel.aggregate([
        { $match: { type: 'command', userId: { $in: similarUserIds }, command: { $nin: [...usedSet] } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec();

      return recommendations
        .map((r: any) => this.enrichCommand(r._id, 'users_like_you', r.count))
        .filter(Boolean) as PersonalizedItem[];
    } catch {
      return [];
    }
  }

  // ── Helpers ──

  private inferCategories(commands: { command: string }[]): Set<string> {
    const cats = new Set<string>();
    for (const { command } of commands) {
      const cmd = BOT_COMMANDS.find(c => c.uniqueName === command);
      if (cmd?.category) cats.add(cmd.category);
    }
    return cats;
  }

  private enrichCommand(
    uniqueName: string,
    reason: string,
    score: number,
  ): PersonalizedItem | null {
    const cmd = BOT_COMMANDS.find(c => c.uniqueName === uniqueName);
    if (!cmd) return null;
    return {
      command: cmd.uniqueName,
      name: cmd.name[0] || cmd.uniqueName,
      category: cmd.category || 'uncategorized',
      description: cmd.description || '',
      reason,
      score,
    };
  }
}
