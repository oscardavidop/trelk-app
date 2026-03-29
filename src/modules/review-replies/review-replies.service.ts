import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { ReviewReply, ReviewReplyDocument } from './schemas/review-reply.schema';
import { ReplyHelpful, ReplyHelpfulDocument } from './schemas/reply-helpful.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { UserStatsService } from '../user-stats/user-stats.service';

@Injectable()
export class ReviewRepliesService {
  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(ReviewReply.name) private readonly replyModel: Model<ReviewReplyDocument>,
    @InjectModel(ReplyHelpful.name) private readonly replyHelpfulModel: Model<ReplyHelpfulDocument>,
    private readonly redis: RedisCacheService,
    private readonly userStats: UserStatsService,
  ) {}

  async submitReply(userId: number, reviewId: string, content: string): Promise<{ id: string; isAdmin: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');

    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 500) throw new BadRequestException('Reply must be 2-500 chars');

    await this.checkRateLimit(`rate:reply:${userId}`, 20, 3600);

    const isAdmin = this.userStats.adminIds.has(userId);
    const oid = new Types.ObjectId(reviewId);

    const reply = await this.replyModel.create({
      reviewId: oid,
      userId,
      isAdmin,
      content: trimmed,
      createdAt: Date.now(),
    });

    await this.ratingModel.updateOne({ _id: oid }, { $inc: { repliesCount: 1 } }).exec();

    return { id: (reply as any)._id.toString(), isAdmin };
  }

  async getReplies(reviewId: string, limit = 20, offset = 0, currentUserId?: number): Promise<{ items: any[]; total: number; hasMore: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');
    const oid = new Types.ObjectId(reviewId);
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const isAdmin = currentUserId ? this.userStats.adminIds.has(currentUserId) : false;
    const review = await this.ratingModel.findById(oid).lean().exec();
    const isOwner = currentUserId && review ? (review as any).userId === currentUserId : false;

    const filter: any = { reviewId: oid };
    if (!isAdmin && !isOwner) {
      filter.isHidden = { $ne: true };
    }

    const [items, total] = await Promise.all([
      this.replyModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(Math.max(offset, 0))
        .limit(safeLimit)
        .lean()
        .exec(),
      this.replyModel.countDocuments(filter).exec(),
    ]);

    const userIds = [...new Set(items.map(i => i.userId))];
    const userMap = userIds.length ? await this.userStats.getUserInfoBatch(userIds) : new Map();

    const replyIds = items.map(r => (r as any)._id);
    const myReplyHelpfuls = currentUserId && replyIds.length
      ? (await this.replyHelpfulModel.find({ userId: currentUserId, replyId: { $in: replyIds } }).lean().exec()).map(h => h.replyId.toString())
      : [];

    return {
      items: items.map(r => {
        const u = userMap.get(r.userId);
        return {
          id: (r as any)._id.toString(),
          userId: r.userId,
          isAdmin: r.isAdmin,
          content: r.content,
          createdAt: r.createdAt,
          isHidden: r.isHidden ?? false,
          isEdited: r.isEdited ?? false,
          editedAt: r.editedAt,
          helpfulCount: r.helpfulCount ?? 0,
          myHelpful: myReplyHelpfuls.includes((r as any)._id.toString()),
          userName: u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : undefined,
          userPhoto: u?.photoUrl,
        };
      }),
      total,
      hasMore: Math.max(offset, 0) + items.length < total,
    };
  }

  async deleteReply(userId: number, replyId: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.userStats.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    await this.replyModel.deleteOne({ _id: oid }).exec();
    await this.replyHelpfulModel.deleteMany({ replyId: oid }).exec();

    await this.ratingModel.updateOne({ _id: reply.reviewId }, { $inc: { repliesCount: -1 } }).exec();
  }

  async editReply(userId: number, replyId: string, content: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.userStats.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 500) throw new BadRequestException('Reply must be 2-500 chars');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    await this.replyModel.updateOne({ _id: oid }, {
      $set: { content: trimmed, isEdited: true, editedAt: Date.now() },
    }).exec();
  }

  async hideReply(userId: number, replyId: string): Promise<{ isHidden: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.userStats.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    const newHidden = !(reply as any).isHidden;
    await this.replyModel.updateOne({ _id: oid }, { $set: { isHidden: newHidden } }).exec();
    return { isHidden: newHidden };
  }

  async toggleReplyHelpful(userId: number, replyId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    const existing = await this.replyHelpfulModel.findOne({ userId, replyId: oid }).lean().exec();
    if (existing) {
      await this.replyHelpfulModel.deleteOne({ _id: (existing as any)._id }).exec();
      await this.replyModel.updateOne({ _id: oid }, { $inc: { helpfulCount: -1 } }).exec();
      const updated = await this.replyModel.findById(oid).lean().exec();
      return { helpful: false, helpfulCount: Math.max(0, (updated as any)?.helpfulCount ?? 0) };
    } else {
      await this.replyHelpfulModel.create({ userId, replyId: oid, createdAt: Date.now() });
      await this.replyModel.updateOne({ _id: oid }, { $inc: { helpfulCount: 1 } }).exec();
      const updated = await this.replyModel.findById(oid).lean().exec();
      return { helpful: true, helpfulCount: (updated as any)?.helpfulCount ?? 1 };
    }
  }

  private async checkRateLimit(key: string, max: number, windowSec: number) {
    if (!this.redis.available) return;

    const current = await this.redis.get<number>(key);
    if (current !== null && current >= max) {
      // throw new HttpException('Too many requests, please try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    const next = (current ?? 0) + 1;
    await this.redis.set(key, next, current === null ? windowSec : undefined);
  }
}
