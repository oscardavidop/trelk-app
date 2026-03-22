import { Injectable, Logger, BadRequestException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { CommandRating, CommandRatingDocument } from './schemas/command-rating.schema';
import { CommandReport, CommandReportDocument } from './schemas/command-report.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteDocument } from '../command-favorites/schemas/command-favorite.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const STATS_TTL = 120;       // 2min cache for aggregated stats
const WEEKLY_TTL = 3600;      // 60min cache for weekly usage
const RATING_LIMIT = 10;     // max ratings per hour
const REPORT_LIMIT = 3;      // max reports per hour
const REPORT_DEDUP_TTL = 86400; // 24h dedup window

@Injectable()
export class CommandStatsService {
  private readonly logger = new Logger(CommandStatsService.name);
  private readonly botToken: string;
  private readonly adminChatId: string;
  private readonly apiUrl: string;



  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(CommandReport.name) private readonly reportModel: Model<CommandReportDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(CommandFavorite.name) private readonly favModel: Model<CommandFavoriteDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('BOT_TOKEN', '');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID', '');
    this.apiUrl = this.configService.get<string>('TELEGRAM_API_URL') || 'https://api.telegram.org';
  }

  // ════════════════════════════════════════════════
  // AGGREGATED STATS
  // ════════════════════════════════════════════════

  async getStats(command: string) {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `command:stats:${cmd}`;

    const cached = await this.redis.get<CommandStatsResult>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [ratingAgg, weeklyUses, favorites] = await Promise.all([
      this.getRatingStats(cmd),
      this.historyModel.countDocuments({
        command: cmd,
        type: 'command',
        timestamp: { $gte: weekAgo },
      }).exec(),
      this.favModel.countDocuments({ command: cmd }).exec(),
    ]);

    const result: CommandStatsResult = {
      rating: ratingAgg.avg,
      ratingsCount: ratingAgg.count,
      weeklyUses,
      favorites,
    };

    await this.redis.set(cacheKey, result, STATS_TTL);
    return result;
  }

  // async getRankings(trendingLimit = 6, popularLimit = 6): Promise<CommandRankingsResult> {
  //   const safeTrending = Math.min(Math.max(trendingLimit || 6, 1), 30);
  //   const safePopular = Math.min(Math.max(popularLimit || 6, 1), 30);
  //   const cacheKey = `command:rankings:${safeTrending}:${safePopular}`;

  //   const cached = await this.redis.get<CommandRankingsResult>(cacheKey);
  //   if (cached) return cached;

  //   const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  //   const [weeklyRows, favoriteRows] = await Promise.all([
  //     this.historyModel.aggregate<{ _id: string; weeklyUses: number }>([
  //       {
  //         $match: {
  //           type: 'command',
  //           timestamp: { $gte: weekAgo },
  //           command: { $exists: true, $ne: null },
  //         },
  //       },
  //       { $project: { command: { $toLower: '$command' } } },
  //       { $match: { command: { $ne: '' } } },
  //       { $group: { _id: '$command', weeklyUses: { $sum: 1 } } },
  //     ]).exec(),
  //     this.favModel.aggregate<{ _id: string; favorites: number }>([
  //       { $match: { command: { $exists: true, $ne: null } } },
  //       { $project: { command: { $toLower: '$command' } } },
  //       { $match: { command: { $ne: '' } } },
  //       { $group: { _id: '$command', favorites: { $sum: 1 } } },
  //     ]).exec(),
  //   ]);

  //   const commandMap = new Map<string, { weeklyUses: number; favorites: number }>();

  //   for (const row of weeklyRows) {
  //     commandMap.set(row._id, { weeklyUses: row.weeklyUses, favorites: 0 });
  //   }

  //   for (const row of favoriteRows) {
  //     const existing = commandMap.get(row._id);
  //     if (existing) {
  //       existing.favorites = row.favorites;
  //     } else {
  //       commandMap.set(row._id, { weeklyUses: 0, favorites: row.favorites });
  //     }
  //   }

  //   const combined: RankingEntry[] = [...commandMap.entries()].map(([command, stats]) => {
  //     const trendingScore = stats.weeklyUses * 2 + stats.favorites;
  //     const popularScore = stats.weeklyUses + stats.favorites;
  //     return {
  //       command,
  //       weeklyUses: stats.weeklyUses,
  //       favorites: stats.favorites,
  //       trendingScore,
  //       popularScore,
  //     };
  //   });

  //   const result: CommandRankingsResult = {
  //     generatedAt: Date.now(),
  //     trending: [...combined]
  //       .sort((a, b) => b.trendingScore - a.trendingScore)
  //       .slice(0, safeTrending),
  //     popular: [...combined]
  //       .sort((a, b) => b.popularScore - a.popularScore)
  //       .slice(0, safePopular),
  //   };

  //   await this.redis.set(cacheKey, result, WEEKLY_TTL);
  //   return result;
  // }

  // ════════════════════════════════════════════════
  // RATING SYSTEM
  // ════════════════════════════════════════════════

  async getRankings(trendingLimit = 6, popularLimit = 6): Promise<CommandRankingsResult> {
    const safeTrending = Math.min(Math.max(trendingLimit || 6, 1), 30);
    const safePopular = Math.min(Math.max(popularLimit || 6, 1), 30);
    const cacheKey = `command:rankings:${safeTrending}:${safePopular}`;

    const cached = await this.redis.get<CommandRankingsResult>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [weeklyRows, favoriteRows] = await Promise.all([
      this.historyModel.aggregate<{ _id: string; weeklyUses: number }>([
        {
          $match: {
            type: 'command',
            timestamp: { $gte: weekAgo },
            // Filtramos nulos, indefinidos y strings vacíos de una vez usando índices
            command: { $type: 'string', $nin: ['', null] },
          },
        },
        {
          // Agrupamos y convertimos a minúsculas en un solo paso
          $group: {
            _id: { $toLower: '$command' },
            weeklyUses: { $sum: 1 }
          }
        },
      ]).exec(),

      this.favModel.aggregate<{ _id: string; favorites: number }>([
        {
          $match: {
            command: { $type: 'string', $nin: ['', null] }
          }
        },
        {
          $group: {
            _id: { $toLower: '$command' },
            favorites: { $sum: 1 }
          }
        },
      ]).exec(),
    ]);

    const commandMap = new Map<string, { weeklyUses: number; favorites: number }>();

    // Tu lógica de mapeo está perfecta y es muy rápida (O(N)), la mantenemos igual.
    for (const row of weeklyRows) {
      commandMap.set(row._id, { weeklyUses: row.weeklyUses, favorites: 0 });
    }

    for (const row of favoriteRows) {
      const existing = commandMap.get(row._id);
      if (existing) {
        existing.favorites = row.favorites;
      } else {
        commandMap.set(row._id, { weeklyUses: 0, favorites: row.favorites });
      }
    }

    const combined: RankingEntry[] = [...commandMap.entries()].map(([command, stats]) => {
      return {
        command,
        weeklyUses: stats.weeklyUses,
        favorites: stats.favorites,
        trendingScore: stats.weeklyUses * 2 + stats.favorites,
        popularScore: stats.weeklyUses + stats.favorites,
      };
    });

    // 1. Calcular trending primero
    const trending = [...combined]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, safeTrending);

    // 2. Crear un Set con los comandos de trending para búsqueda instantánea O(1)
    const trendingCommands = new Set(trending.map(t => t.command));

    // 3. Calcular popular filtrando los que ya están en trending
    const popular = combined
      .sort((a, b) => b.popularScore - a.popularScore)
      // Filtramos: que NO esté en el Set de trending
      .filter(item => !trendingCommands.has(item.command))
      .slice(0, safePopular);

    // 4. Armar el objeto final
    const result: CommandRankingsResult = {
      generatedAt: Date.now(),
      trending,
      popular
    };


    // Asumo que WEEKLY_TTL está definido en otra parte de tu archivo
    await this.redis.set(cacheKey, result, WEEKLY_TTL);
    return result;
  }

  /** Get aggregated rating stats from Redis cache or Mongo */
  private async getRatingStats(command: string): Promise<{ avg: number; count: number }> {
    const cacheKey = `command:rating:${command}`;
    const cached = await this.redis.get<{ avg: number; count: number; sum: number }>(cacheKey);
    if (cached) return { avg: cached.avg, count: cached.count };

    const agg = await this.ratingModel.aggregate([
      { $match: { command } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 }, sum: { $sum: '$rating' } } },
    ]).exec();

    const result = agg[0] ?? { avg: 0, count: 0, sum: 0 };
    const rounded = { avg: Math.round(result.avg * 100) / 100, count: result.count, sum: result.sum };
    await this.redis.set(cacheKey, rounded, STATS_TTL);
    return rounded;
  }

  /** Get user's own rating/feedback for a command */
  async getMyRating(userId: number, command: string): Promise<{ rating: number | null; review: string | null; feedback: 'useful' | 'not_useful' | null; reason: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' | null }> {
    const doc = await this.ratingModel
      .findOne({ userId, command: command.toLowerCase().trim() })
      .lean()
      .exec();
    return doc
      ? {
        rating: doc.rating,
        review: (doc as any).review ?? null,
        feedback: (doc as any).feedback ?? null,
        reason: (doc as any).reason ?? null,
      }
      : { rating: null, review: null, feedback: null, reason: null };
  }

  /** Submit or update a rating */
  async rate(userId: number, command: string, rating: number, review?: string): Promise<void> {
    const cmd = command.toLowerCase().trim();

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }

    // Validate review
    if (review !== undefined && review !== null) {
      const trimmed = review.trim();
      if (trimmed.length > 500) throw new BadRequestException('Review max 500 chars');
    }

    // Rate limit: 10 ratings per hour
    await this.checkRateLimit(`rate:rating:${userId}`, RATING_LIMIT, 3600);

    const now = Date.now();
    const updateData: any = {
      rating,
      updatedAt: now,
    };
    if (review !== undefined) {
      updateData.review = review?.trim() || undefined;
    }

    await this.ratingModel.findOneAndUpdate(
      { userId, command: cmd },
      { $set: updateData, $setOnInsert: { createdAt: now } },
      { upsert: true },
    ).exec();

    // Invalidate caches
    await this.redis.del(`command:rating:${cmd}`);
    await this.redis.del(`command:stats:${cmd}`);
  }

  /** Submit useful / not-useful feedback and optional reason */
  async submitFeedback(
    userId: number,
    command: string,
    useful: boolean,
    reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing',
  ): Promise<void> {
    const cmd = command.toLowerCase().trim();

    if (!useful && !reason) {
      throw new BadRequestException('reason required when useful=false');
    }

    if (reason && !['didnt_work', 'too_slow', 'bad_results', 'confusing'].includes(reason)) {
      throw new BadRequestException('Invalid reason');
    }

    await this.checkRateLimit(`rate:feedback:${userId}`, RATING_LIMIT, 3600);

    const now = Date.now();
    await this.ratingModel.findOneAndUpdate(
      { userId, command: cmd },
      {
        $set: {
          feedback: useful ? 'useful' : 'not_useful',
          reason: useful ? undefined : reason,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    ).exec();

    await this.redis.del(`command:rating:${cmd}`);
    await this.redis.del(`command:stats:${cmd}`);
  }

  /** Get recent reviews for a command */
  async getReviews(command: string, limit = 10, offset = 0) {
    const cmd = command.toLowerCase().trim();
    const safeLimit = Math.min(Math.max(limit, 1), 30);

    const items = await this.ratingModel
      .find({ command: cmd, review: { $exists: true, $ne: '' } })
      .sort({ updatedAt: -1 })
      .skip(Math.max(offset, 0))
      .limit(safeLimit)
      .select('userId rating review updatedAt')
      .lean()
      .exec();

    return {
      items: items.map((r) => ({
        userId: r.userId,
        rating: r.rating,
        review: (r as any).review,
        date: r.updatedAt,
      })),
      hasMore: items.length === safeLimit,
    };
  }

  // ════════════════════════════════════════════════
  // REPORT SYSTEM
  // ════════════════════════════════════════════════

  async submitReport(
    userId: number,
    command: string,
    category: string,
    message: string,
    ip?: string,
  ): Promise<void> {
    const cmd = command.toLowerCase().trim();
    const msg = message.trim();

    // Validate
    if (!['bug', 'wrong_result', 'crash', 'other'].includes(category)) {
      throw new BadRequestException('Invalid category');
    }
    if (msg.length < 10) throw new BadRequestException('Message must be at least 10 characters');
    if (msg.length > 500) throw new BadRequestException('Message max 500 characters');

    // Rate limit: 3 reports per hour
    await this.checkRateLimit(`rate:report:${userId}`, REPORT_LIMIT, 3600);

    // Dedup: same user + command within 24h
    const dedupKey = `report:hash:${userId}:${cmd}`;
    const existing = await this.redis.get<string>(dedupKey);
    if (existing) {
      throw new HttpException('Ya reportaste este comando recientemente', HttpStatus.TOO_MANY_REQUESTS);
    }

    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

    await this.reportModel.create({
      userId,
      command: cmd,
      message: msg,
      category,
      createdAt: Date.now(),
      status: 'open',
      ipHash,
    });

    // Mark dedup
    await this.redis.set(dedupKey, '1', REPORT_DEDUP_TTL);

    // Notify admin via Telegram
    this.notifyAdmin(cmd, userId, category, msg).catch(() => { });
  }

  // ════════════════════════════════════════════════
  // ADMIN NOTIFICATION
  // ════════════════════════════════════════════════

  private async notifyAdmin(command: string, userId: number, category: string, message: string) {
    if (!this.botToken || !this.adminChatId) return;

    const text = [
      `🚨 *Nuevo reporte de comando*`,
      ``,
      `*Comando:* /${command}`,
      `*Usuario:* ${userId}`,
      `*Tipo:* ${category}`,
      ``,
      `*Mensaje:*`,
      `"${message}"`,
    ].join('\n');

    try {
      await fetch(`${this.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.adminChatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      this.logger.warn(`Failed to notify admin: ${(err as Error).message}`);
    }
  }

  // ════════════════════════════════════════════════
  // RATE LIMIT HELPER
  // ════════════════════════════════════════════════

  private async checkRateLimit(key: string, max: number, windowSec: number) {
    if (!this.redis.available) return; // Skip if Redis is down

    const current = await this.redis.get<number>(key);
    if (current !== null && current >= max) {
      throw new HttpException('Demasiadas solicitudes, intenta más tarde', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment — use set with existing TTL preservation
    const next = (current ?? 0) + 1;
    await this.redis.set(key, next, current === null ? windowSec : undefined);
  }
}

// ── Types ──────────────────────────────────────────

export interface CommandStatsResult {
  rating: number;
  ratingsCount: number;
  weeklyUses: number;
  favorites: number;
}

export interface RankingEntry {
  command: string;
  weeklyUses: number;
  favorites: number;
  trendingScore: number;
  popularScore: number;
}

export interface CommandRankingsResult {
  generatedAt: number;
  trending: RankingEntry[];
  popular: RankingEntry[];
}
