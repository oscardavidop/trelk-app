import { Injectable, Logger, BadRequestException, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Queue } from 'bullmq';
import { Suggestion, SuggestionDocument, SuggestionStatus } from './schemas/suggestion.schema';
import { SuggestionVote, SuggestionVoteDocument } from './schemas/suggestion-vote.schema';
import { SuggestionComment, SuggestionCommentDocument } from './schemas/suggestion-comment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { CacheInvalidationService } from '../../core/resilience/cache-invalidation.service';

const LIST_TTL = 30;           // 30s cache for lists
const DETAIL_TTL = 15;         // 15s cache for single suggestion
const CREATE_LIMIT = 3;        // max suggestions per day
const COMMENT_LIMIT = 10;      // max comments per hour
const VOTE_LIMIT = 30;         // max votes per hour
const MIN_TITLE_LENGTH = 5;
const MIN_DESC_LENGTH = 15;

type SortMode = 'trending' | 'top' | 'new';

@Injectable()
export class SuggestionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SuggestionsService.name);
  private readonly adminIds: Set<number>;
  private readonly botToken: string;
  private readonly adminChatId: string;
  private readonly apiUrl: string;
  private suggestionQueue: Queue | null = null;

  constructor(
    @InjectModel(Suggestion.name) private readonly suggestionModel: Model<SuggestionDocument>,
    @InjectModel(SuggestionVote.name) private readonly voteModel: Model<SuggestionVoteDocument>,
    @InjectModel(SuggestionComment.name) private readonly commentModel: Model<SuggestionCommentDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {
    const adminIdsStr = this.configService.get<string>('ADMIN_IDS', '');
    this.adminIds = new Set(adminIdsStr.split(',').map(Number).filter(Boolean));
    this.botToken = this.configService.get<string>('BOT_TOKEN', '');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID', '');
    this.apiUrl = this.configService.get<string>('TELEGRAM_API_URL') || 'https://api.telegram.org';
  }

  async onModuleInit() {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '') || undefined;

      this.suggestionQueue = new Queue('process-suggestion', {
        connection: { host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });

      this.logger.log('Suggestion dispatch queue initialized');
    } catch (err) {
      this.logger.error(`Failed to init suggestion queue: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.suggestionQueue) await this.suggestionQueue.close().catch(() => {});
  }

  // ══════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════

  async create(userId: number, title: string, description: string) {
    title = title?.trim();
    description = description?.trim();

    if (!title || title.length < MIN_TITLE_LENGTH) throw new BadRequestException('title_too_short');
    if (!description || description.length < MIN_DESC_LENGTH) throw new BadRequestException('description_too_short');
    if (title.length > 120) throw new BadRequestException('title_too_long');
    if (description.length > 2000) throw new BadRequestException('description_too_long');

    // Rate limit
    await this.checkRateLimit(`suggestions:create:${userId}`, CREATE_LIMIT, 86400, 'create_limit');

    const suggestion = await this.suggestionModel.create({
      userId,
      title,
      description,
      status: 'pending',
      votesCount: 1, // auto-upvote by creator
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Auto-vote by creator
    await this.voteModel.create({ userId, suggestionId: suggestion._id.toString(), createdAt: Date.now() });

    // Invalidate list cache
    await this.invalidateListCache();

    // Enqueue worker job for GitHub issue creation
    await this.enqueueSuggestion(suggestion._id.toString());

    // Notify admin via Telegram
    this.notifyAdmin(userId, title, description).catch(() => {});

    return { id: suggestion._id.toString() };
  }

  // ══════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════

  async list(sort: SortMode, limit: number, offset: number, status?: string, userId?: number) {
    const safeLimit = Math.min(Math.max(limit || 10, 1), 30);
    const safeOffset = Math.max(offset || 0, 0);

    const cacheKey = `suggestions:list:${sort}:${safeLimit}:${safeOffset}:${status || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      // Attach vote info for current user (not cached)
      if (userId) {
        cached.items = await this.attachVoteInfo(cached.items, userId);
      }
      return cached;
    }

    const filter: Record<string, any> = {};
    if (status && status !== 'all') {
      if (!['pending', 'reviewing', 'planned', 'in_progress', 'done', 'declined'].includes(status)) {
        throw new BadRequestException('invalid_status');
      }
      filter.status = status;
    }

    let sortQuery: Record<string, any>;
    switch (sort) {
      case 'top':
        sortQuery = { votesCount: -1, createdAt: -1 };
        break;
      case 'trending':
        sortQuery = { updatedAt: -1, votesCount: -1 };
        break;
      case 'new':
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    const [items, total] = await Promise.all([
      this.suggestionModel
        .find(filter)
        .sort(sortQuery)
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.suggestionModel.countDocuments(filter).exec(),
    ]);

    const mapped = items.map((s: any) => ({
      id: s._id.toString(),
      userId: s.userId,
      title: s.title,
      description: s.description,
      status: s.status,
      votesCount: s.votesCount,
      commentsCount: s.commentsCount,
      adminNote: s.adminNote,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    // Attach user info
    const userIds = [...new Set(mapped.map((s) => s.userId))];
    const users = await this.userModel.find({ 'authTelegram.id': { $in: userIds } }).lean().exec();
    const userMap = new Map(users.map((u: any) => [u.authTelegram?.id, u]));

    for (const item of mapped) {
      const u: any = userMap.get(item.userId);
      if (u) {
        item['userName'] = u.authTelegram?.firstName || 'User';
        item['userPhoto'] = u.authTelegram?.photoUrl || null;
      }
    }

    const result = { items: mapped, total, hasMore: safeOffset + safeLimit < total };
    await this.redis.set(cacheKey, result, LIST_TTL);

    if (userId) {
      result.items = await this.attachVoteInfo(result.items, userId);
    }

    return result;
  }

  // ══════════════════════════════════════════
  // GET BY ID
  // ══════════════════════════════════════════

  async getById(id: string, userId?: number) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('invalid_id');

    const cacheKey = `suggestions:detail:${id}`;
    let cached = await this.redis.get<any>(cacheKey);

    if (!cached) {
      const doc = await this.suggestionModel.findById(id).lean().exec();
      if (!doc) throw new BadRequestException('not_found');

      cached = {
        id: (doc as any)._id.toString(),
        userId: (doc as any).userId,
        title: (doc as any).title,
        description: (doc as any).description,
        status: (doc as any).status,
        votesCount: (doc as any).votesCount,
        commentsCount: (doc as any).commentsCount,
        adminNote: (doc as any).adminNote,
        githubIssueUrl: (doc as any).githubIssueUrl,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };

      // Attach user info
      const user = await this.userModel.findOne({ 'authTelegram.id': cached.userId }).lean().exec();
      if (user) {
        cached.userName = (user as any).authTelegram?.firstName || 'User';
        cached.userPhoto = (user as any).authTelegram?.photoUrl || null;
      }

      await this.redis.set(cacheKey, cached, DETAIL_TTL);
    }

    if (userId) {
      const voted = await this.voteModel.exists({ userId, suggestionId: id });
      cached.myVote = !!voted;
    }

    return cached;
  }

  // ══════════════════════════════════════════
  // VOTE / UNVOTE (toggle)
  // ══════════════════════════════════════════

  async toggleVote(userId: number, suggestionId: string) {
    if (!Types.ObjectId.isValid(suggestionId)) throw new BadRequestException('invalid_id');

    const exists = await this.suggestionModel.exists({ _id: suggestionId });
    if (!exists) throw new BadRequestException('not_found');

    await this.checkRateLimit(`suggestions:vote:${userId}`, VOTE_LIMIT, 3600, 'vote_limit');

    const existing = await this.voteModel.findOneAndDelete({ userId, suggestionId }).exec();
    let voted: boolean;

    if (existing) {
      // Unvote
      await this.suggestionModel.updateOne({ _id: suggestionId }, { $inc: { votesCount: -1 }, $set: { updatedAt: Date.now() } }).exec();
      voted = false;
    } else {
      // Vote
      await this.voteModel.create({ userId, suggestionId, createdAt: Date.now() });
      await this.suggestionModel.updateOne({ _id: suggestionId }, { $inc: { votesCount: 1 }, $set: { updatedAt: Date.now() } }).exec();
      voted = true;
    }

    await this.invalidateDetailCache(suggestionId);
    await this.invalidateListCache();

    const updated = await this.suggestionModel.findById(suggestionId, 'votesCount').lean().exec();
    return { voted, votesCount: (updated as any)?.votesCount || 0 };
  }

  // ══════════════════════════════════════════
  // COMMENTS
  // ══════════════════════════════════════════

  async addComment(userId: number, suggestionId: string, content: string) {
    content = content?.trim();
    if (!content || content.length < 3) throw new BadRequestException('comment_too_short');
    if (content.length > 1000) throw new BadRequestException('comment_too_long');
    if (!Types.ObjectId.isValid(suggestionId)) throw new BadRequestException('invalid_id');

    const exists = await this.suggestionModel.exists({ _id: suggestionId });
    if (!exists) throw new BadRequestException('not_found');

    await this.checkRateLimit(`suggestions:comment:${userId}`, COMMENT_LIMIT, 3600, 'comment_limit');

    const isAdmin = this.adminIds.has(userId);

    const comment = await this.commentModel.create({
      userId,
      suggestionId,
      content,
      isAdmin,
      createdAt: Date.now(),
    });

    await this.suggestionModel.updateOne(
      { _id: suggestionId },
      { $inc: { commentsCount: 1 }, $set: { updatedAt: Date.now() } },
    ).exec();

    await this.invalidateDetailCache(suggestionId);

    return {
      id: comment._id.toString(),
      isAdmin,
    };
  }

  async getComments(suggestionId: string, limit: number, offset: number) {
    if (!Types.ObjectId.isValid(suggestionId)) throw new BadRequestException('invalid_id');

    const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
    const safeOffset = Math.max(offset || 0, 0);

    const [items, total] = await Promise.all([
      this.commentModel
        .find({ suggestionId })
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.commentModel.countDocuments({ suggestionId }).exec(),
    ]);

    const mapped = items.map((c: any) => ({
      id: c._id.toString(),
      userId: c.userId,
      content: c.content,
      isAdmin: c.isAdmin,
      createdAt: c.createdAt,
    }));

    // Attach user info
    const userIds = [...new Set(mapped.map((c) => c.userId))];
    const users = await this.userModel.find({ 'authTelegram.id': { $in: userIds } }).lean().exec();
    const userMap = new Map(users.map((u: any) => [u.authTelegram?.id, u]));

    for (const item of mapped) {
      const u: any = userMap.get(item.userId);
      if (u) {
        item['userName'] = u.authTelegram?.firstName || 'User';
        item['userPhoto'] = u.authTelegram?.photoUrl || null;
      }
    }

    return { items: mapped, total, hasMore: safeOffset + safeLimit < total };
  }

  // ══════════════════════════════════════════
  // SIMILAR SUGGESTION DETECTION
  // ══════════════════════════════════════════

  async findSimilar(title: string) {
    title = title?.trim();
    if (!title || title.length < 3) return { items: [] };

    const results = await this.suggestionModel
      .find(
        { $text: { $search: title } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .lean()
      .exec();

    return {
      items: results
        .filter((r: any) => r.score > 0.5)
        .map((r: any) => ({
          id: r._id.toString(),
          title: r.title,
          votesCount: r.votesCount,
          status: r.status,
        })),
    };
  }

  // ══════════════════════════════════════════
  // ADMIN: UPDATE STATUS
  // ══════════════════════════════════════════

  async updateStatus(adminId: number, suggestionId: string, status: SuggestionStatus, adminNote?: string) {
    if (!this.adminIds.has(adminId)) throw new ForbiddenException('admin_only');
    if (!Types.ObjectId.isValid(suggestionId)) throw new BadRequestException('invalid_id');

    const validStatuses: SuggestionStatus[] = ['pending', 'reviewing', 'planned', 'in_progress', 'done', 'declined'];
    if (!validStatuses.includes(status)) throw new BadRequestException('invalid_status');

    const update: Record<string, any> = { status, updatedAt: Date.now() };
    if (adminNote !== undefined) update.adminNote = adminNote;

    await this.suggestionModel.updateOne({ _id: suggestionId }, { $set: update }).exec();

    await this.invalidateDetailCache(suggestionId);
    await this.invalidateListCache();

    return { ok: true };
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  private async attachVoteInfo(items: any[], userId: number) {
    if (!items.length) return items;
    const ids = items.map((i) => i.id);
    const votes = await this.voteModel.find({ userId, suggestionId: { $in: ids } }).lean().exec();
    const votedSet = new Set(votes.map((v: any) => v.suggestionId));
    return items.map((i) => ({ ...i, myVote: votedSet.has(i.id) }));
  }

  private async checkRateLimit(key: string, max: number, windowSec: number, errorKey: string) {
    const current = await this.redis.get<number>(key);
    if (current !== null && current >= max) {
      throw new BadRequestException(errorKey);
    }
    await this.redis.set(key, (current ?? 0) + 1, windowSec);
  }

  private async invalidateListCache() {
    await this.cacheInvalidation.emit({ type: 'suggestion_list_changed' });
  }

  private async invalidateDetailCache(id: string) {
    await this.cacheInvalidation.emit({ type: 'suggestion_updated', suggestionId: id });
  }

  private async enqueueSuggestion(suggestionId: string): Promise<void> {
    if (!this.suggestionQueue) {
      this.logger.warn('Suggestion queue not available, skipping GitHub dispatch');
      return;
    }
    try {
      await this.suggestionQueue.add('dispatch-suggestion', { suggestionId }, {
        jobId: `suggestion_${suggestionId}`,
      });
    } catch (err) {
      this.logger.error(`Failed to enqueue suggestion job: ${(err as Error).message}`);
    }
  }

  private async notifyAdmin(userId: number, title: string, description: string) {
    if (!this.botToken || !this.adminChatId) return;
    const text = [
      `💡 *New Feature Suggestion*`,
      ``,
      `*From:* ${userId}`,
      `*Title:* ${title}`,
      ``,
      `${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`,
    ].join('\n');

    try {
      await fetch(`${this.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.adminChatId, text, parse_mode: 'Markdown' }),
      });
    } catch { /* ignore */ }
  }
}
