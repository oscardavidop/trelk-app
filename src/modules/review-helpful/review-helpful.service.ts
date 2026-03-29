import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { ReviewHelpful, ReviewHelpfulDocument } from './schemas/review-helpful.schema';

@Injectable()
export class ReviewHelpfulService {
  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(ReviewHelpful.name) private readonly helpfulModel: Model<ReviewHelpfulDocument>,
  ) {}

  async toggleHelpful(userId: number, reviewId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');
    const oid = new Types.ObjectId(reviewId);

    const existing = await this.helpfulModel.findOne({ userId, reviewId: oid }).lean().exec();

    if (existing) {
      await this.helpfulModel.deleteOne({ _id: (existing as any)._id }).exec();
      const doc = await this.ratingModel.findByIdAndUpdate(
        oid,
        { $inc: { helpfulCount: -1 } },
        { new: true },
      ).select('helpfulCount').lean().exec();
      return { helpful: false, helpfulCount: Math.max((doc as any)?.helpfulCount ?? 0, 0) };
    } else {
      await this.helpfulModel.create({ userId, reviewId: oid, createdAt: Date.now() });
      const doc = await this.ratingModel.findByIdAndUpdate(
        oid,
        { $inc: { helpfulCount: 1 } },
        { new: true },
      ).select('helpfulCount').lean().exec();
      return { helpful: true, helpfulCount: (doc as any)?.helpfulCount ?? 1 };
    }
  }

  async getMyHelpfuls(userId: number, reviewIds: string[]): Promise<string[]> {
    const { Types } = await import('mongoose');
    const oids = reviewIds.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    if (!oids.length) return [];
    const docs = await this.helpfulModel.find({ userId, reviewId: { $in: oids } }).select('reviewId').lean().exec();
    return docs.map(d => d.reviewId.toString());
  }
}
