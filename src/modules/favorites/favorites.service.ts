import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { FavCollection, FavCollectionDocument } from './schemas/fav-collection.schema';

export interface PaginatedFavorites {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface FavoritesFilter {
  context?: string;
  engine?: string;
  search?: string;
  collectionId?: string;
  projections?: string | string[];
}

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);
  private readonly filePathCache = new Map<string, { path: string; expires: number }>();
  private readonly botToken: string;

  constructor(
    @InjectModel(Favorite.name) private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(FavCollection.name) private readonly collectionModel: Model<FavCollectionDocument>,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('BOT_TOKEN')!;
  }

  // ════════════════════════════════════════════════
  // FAVORITES CRUD
  // ════════════════════════════════════════════════

  async findPaginated(
    userId: number,
    cursor?: string,
    limit = 24,
    filters?: FavoritesFilter,
  ): Promise<PaginatedFavorites> {
    const query: Record<string, any> = { userId };

    if (cursor && Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    if (filters?.context) query.context = filters.context;
    if (filters?.engine) query.engine = filters.engine;

    if (filters?.collectionId) {
      query.collectionId = filters.collectionId === 'none'
        ? null
        : new Types.ObjectId(filters.collectionId);
    }

    if (filters?.search) {
      // Use regex search — works without text index too, case insensitive
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { 'data.caption': { $regex: escaped, $options: 'i' } },
        { 'data.title': { $regex: escaped, $options: 'i' } },
        { engine_id: { $regex: escaped, $options: 'i' } },
      ];
    }

    let projectionObject: Record<string, number> = {};

    if (filters?.projections) {
      const projArray = Array.isArray(filters.projections)
        ? filters.projections
        : filters.projections.split(',');

      const validFields = projArray
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // Convertimos ['campo1', 'campo2'] a { campo1: 1, campo2: 1 }
      if (validFields.length > 0) {
        projectionObject = validFields.reduce((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }


    const countQuery: Record<string, any> = { ...query };
    delete countQuery._id; // count total without cursor

    const [items, total] = await Promise.all([
      this.favoriteModel
        .find(query)
        .select(projectionObject) // Usar .select() es más limpio que el 2do argumento de find()
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean()
        .exec(),
      this.favoriteModel.countDocuments(countQuery),
    ]);

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.length > 0 ? String(items[items.length - 1]._id) : null,
      hasMore,
      total,
    };
  }

  async deleteById(id: string, userId: number): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const fav = await this.favoriteModel.findById(id).lean().exec();
    if (!fav) throw new NotFoundException('Not found');
    if (fav.userId !== userId) throw new ForbiddenException('Not your favorite');
    await this.favoriteModel.deleteOne({ _id: id });
    // Decrement collection count
    if (fav.collectionId) {
      await this.collectionModel.updateOne(
        { _id: fav.collectionId, userId },
        { $inc: { count: -1 } },
      );
    }
  }

  async deleteBatch(ids: string[], userId: number): Promise<{ deleted: number }> {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return { deleted: 0 };
    const result = await this.favoriteModel.deleteMany({ _id: { $in: objectIds }, userId });
    return { deleted: result.deletedCount };
  }

  async getFilters(userId: number): Promise<{ contexts: string[]; engines: string[] }> {
    const [contexts, engines] = await Promise.all([
      this.favoriteModel.distinct('context', { userId }),
      this.favoriteModel.distinct('engine', { userId }),
    ]);
    return { contexts: contexts.sort(), engines: engines.sort() };
  }

  async moveFavorites(ids: string[], collectionId: string | null, userId: number): Promise<void> {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return;

    const colId = collectionId && Types.ObjectId.isValid(collectionId)
      ? new Types.ObjectId(collectionId)
      : null;

    // Validate collection ownership
    if (colId) {
      const col = await this.collectionModel.findById(colId).lean().exec();
      if (!col || col.userId !== userId) throw new ForbiddenException('Collection not found');
    }

    await this.favoriteModel.updateMany(
      { _id: { $in: objectIds }, userId },
      { $set: { collectionId: colId } },
    );

    // Refresh counts on all collections for this user
    await this.refreshCollectionCounts(userId);
  }

  async getRandomFavorites(userId: number, limit = 10): Promise<any[]> {
    return this.favoriteModel.aggregate([
      { $match: { userId, 'data.photo': { $exists: true, $ne: [] } } },
      { $sample: { size: limit } },
    ]).exec();
  }

  // ════════════════════════════════════════════════
  // COLLECTIONS
  // ════════════════════════════════════════════════

  async getCollections(userId: number) {
    return this.collectionModel.find({ userId }).sort({ name: 1 }).lean().exec();
  }

  async createCollection(userId: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw new BadRequestException('Name must be 1-60 chars');
    const existing = await this.collectionModel.findOne({ userId, name: trimmed }).lean().exec();
    if (existing) throw new BadRequestException('Collection already exists');
    return this.collectionModel.create({ userId, name: trimmed, count: 0 });
  }

  async updateCollection(id: string, userId: number, name: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw new BadRequestException('Name must be 1-60 chars');
    const col = await this.collectionModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { name: trimmed } },
      { new: true },
    ).lean().exec();
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async deleteCollection(id: string, userId: number) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const col = await this.collectionModel.findOne({ _id: id, userId }).lean().exec();
    if (!col) throw new NotFoundException('Collection not found');
    // Unset collectionId on all favorites in this collection
    await this.favoriteModel.updateMany(
      { collectionId: new Types.ObjectId(id), userId },
      { $set: { collectionId: null } },
    );
    await this.collectionModel.deleteOne({ _id: id });
  }

  private async refreshCollectionCounts(userId: number) {
    const counts = await this.favoriteModel.aggregate([
      { $match: { userId, collectionId: { $ne: null } } },
      { $group: { _id: '$collectionId', count: { $sum: 1 } } },
    ]).exec();

    const countMap = new Map(counts.map((c: any) => [String(c._id), c.count]));
    const collections = await this.collectionModel.find({ userId }).lean().exec();

    const ops = collections.map((col) => ({
      updateOne: {
        filter: { _id: col._id },
        update: { $set: { count: countMap.get(String(col._id)) || 0 } },
      },
    }));

    if (ops.length > 0) await this.collectionModel.bulkWrite(ops);
  }

  // ════════════════════════════════════════════════
  // FILE PROXY (SECURE — streams content, never exposes token)
  // ════════════════════════════════════════════════

  async getFileStream(fileId: string): Promise<{ stream: ReadableStream; contentType: string; contentLength?: string }> {
    const filePath = await this.resolveFilePath(fileId);
    const url = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new NotFoundException('File not available');
    }

    return {
      stream: response.body as any,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: response.headers.get('content-length') || undefined,
    };
  }

  private async resolveFilePath(fileId: string): Promise<string> {
    const cached = this.filePathCache.get(fileId);
    if (cached && cached.expires > Date.now()) return cached.path;

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const json: any = await res.json();
    if (!json.ok || !json.result?.file_path) {
      throw new NotFoundException('Telegram file not found or expired');
    }

    const filePath: string = json.result.file_path;
    this.filePathCache.set(fileId, { path: filePath, expires: Date.now() + 3_600_000 });

    // Prune if too large
    if (this.filePathCache.size > 10_000) {
      const now = Date.now();
      for (const [key, val] of this.filePathCache) {
        if (val.expires < now) this.filePathCache.delete(key);
      }
    }

    return filePath;
  }
}
