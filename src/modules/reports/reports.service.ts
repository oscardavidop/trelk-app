import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { CommandReport, CommandReportDocument } from './schemas/command-report.schema';
import { ReportEvent, ReportEventDocument } from './schemas/report-event.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
// import { ReportUploadService } from '../uploads/report-upload.service';
import { ReviewModerationService } from '../moderation/review-moderation.service';
import { REPORT_LIMIT, REPORT_DEDUP_TTL } from '../../common/constants/command-stats.constants';
import { AppError, ErrorCode } from '../../common/errors';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly botToken: string;
  private readonly adminChatId: string;
  private readonly apiUrl: string;

  constructor(
    @InjectModel(CommandReport.name) private readonly reportModel: Model<CommandReportDocument>,
    @InjectModel(ReportEvent.name) private readonly reportEventModel: Model<ReportEventDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
    // private readonly reportUpload: ReportUploadService,
    private readonly moderation: ReviewModerationService,
  ) {
    this.botToken = this.configService.get<string>('BOT_TOKEN', '');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID', '');
    this.apiUrl = this.configService.get<string>('TELEGRAM_API_URL') || 'https://api.telegram.org';
  }

  async reportReview(userId: number, reviewId: string, reason: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');

    await this.checkRateLimit(`rate:review-report:${userId}`, 5, 3600);

    const dedupKey = `review-report:${userId}:${reviewId}`;
    const existing = await this.redis.get<string>(dedupKey);
    if (existing) throw new BadRequestException('Already reported');

    await this.redis.set(dedupKey, '1', 86400);

    this.notifyAdmin(
      `review:${reviewId}`,
      userId,
      'review_report',
      `Review reported as: ${reason}`,
    ).catch(() => { });
  }

  async uploadReportScreenshots(
    files: Array<{ filename: string; mimetype: string; data: Buffer }>,
  ): Promise<string[]> {
    if (!files.length) return [];
    // return this.reportUpload.saveFiles(files);
    return [];
  }

  async submitReport(
    userId: number,
    command: string,
    category: string,
    message: string,
    ip?: string,
    screenshots: string[] = [],
    userAgent?: string,
    appVersion?: string,
  ): Promise<{ ok: true }> {
    const cmd = command.toLowerCase().trim();
    const msg = message.trim();

    if (!['bug', 'wrong_result', 'crash', 'other'].includes(category)) {
      throw new BadRequestException('Invalid category');
    }
    if (msg.length < 10) throw new BadRequestException('Message must be at least 10 characters');
    if (msg.length > 500) throw new BadRequestException('Message max 500 characters');

    await this.checkRateLimit(`rate:report:${userId}`, REPORT_LIMIT, 600);

    const dedupKey = `report:hash:${userId}:${cmd}`;
    const existing = await this.redis.get<string>(dedupKey);
    if (existing) {
      throw new AppError(ErrorCode.REPORT_DUPLICATE, 'Already reported this command recently', 429, undefined, true);
    }

    const msgHash = createHash('sha256').update(`${userId}:${msg}`).digest('hex').slice(0, 16);
    const spamKey = `report:spam:${msgHash}`;
    const spamExists = await this.redis.get<string>(spamKey);
    if (spamExists) {
      throw new AppError(ErrorCode.REPORT_DUPLICATE, 'Duplicate message detected', 429, undefined, true);
    }

    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

    const report = await this.reportModel.create({
      userId,
      command: cmd,
      message: msg,
      category,
      screenshots,
      createdAt: Date.now(),
      status: 'open',
      ipHash,
      userAgent,
      appVersion,
    });

    await this.redis.set(dedupKey, '1', REPORT_DEDUP_TTL);
    await this.redis.set(spamKey, '1', 3600);

    this.moderation.enqueueReport(report._id.toString()).catch((err) =>
      this.logger.warn(`Report enqueue failed: ${(err as Error).message}`),
    );

    return { ok: true };
  }

  async getUserReports(userId: number, limit = 10, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const safeOffset = Math.max(offset, 0);

    const [items, total] = await Promise.all([
      this.reportModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .select('command message category createdAt status')
        .lean()
        .exec(),
      this.reportModel.countDocuments({ userId }).exec(),
    ]);

    return {
      items: items.map((r) => ({
        id: (r as any)._id.toString(),
        command: r.command,
        message: r.message,
        category: r.category,
        screenshots: r.screenshots || [],
        createdAt: r.createdAt,
        status: r.status,
        githubIssueUrl: r.githubIssueUrl,
      })),
      total,
      hasMore: safeOffset + items.length < total,
    };
  }

  async getReportStats(command: string) {
    const cmd = command.toLowerCase().trim();
    const counts = await this.reportModel.aggregate([
      { $match: { command: cmd } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).exec();

    const stats: Record<string, number> = {};
    for (const c of counts) {
      stats[c._id] = c.count;
    }
    return { command: cmd, total: Object.values(stats).reduce((a, b) => a + b, 0), byCategory: stats };
  }

  async hasUserReported(userId: number, command: string): Promise<boolean> {
    const cmd = command.toLowerCase().trim();
    const count = await this.reportModel.countDocuments({ userId, command: cmd }).exec();
    return count > 0;
  }

  async getReportTimeline(userId: number, reportId: string, limit = 50, before?: number) {
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId,
    }).lean().exec();
    if (!report) throw new BadRequestException('Report not found');

    const filter: Record<string, unknown> = { reportId: report._id };
    if (before) filter.createdAt = { $lt: before };

    const events = await this.reportEventModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();

    return {
      items: events.map((e) => ({
        id: (e as any)._id.toString(),
        type: e.type,
        action: e.action,
        actor: e.actor,
        content: e.content,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      hasMore: events.length === limit,
    };
  }

  async getReportDetail(userId: number, reportId: string) {
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId,
    }).lean().exec();
    if (!report) throw new BadRequestException('Report not found');

    const eventsCount = await this.reportEventModel.countDocuments({ reportId: report._id }).exec();
    const lastEvent = await this.reportEventModel
      .findOne({ reportId: report._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      id: (report as any)._id.toString(),
      command: report.command,
      message: report.message,
      category: report.category,
      screenshots: report.screenshots || [],
      createdAt: report.createdAt,
      status: report.status,
      githubIssueUrl: report.githubIssueUrl,
      githubIssueNumber: report.githubIssueNumber,
      githubState: report.githubState || null,
      githubLabels: report.githubLabels || [],
      githubAssignees: report.githubAssignees || [],
      eventsCount,
      lastUpdate: lastEvent?.createdAt || report.createdAt,
    };
  }

  private async notifyAdmin(command: string, userId: number, category: string, message: string, screenshots: string[] = []) {
    if (!this.botToken || !this.adminChatId) return;

    const screenshotLines = screenshots.length > 0
      ? `\n📎 *Screenshots:* ${screenshots.length}`
      : '';

    const text = [
      `🚨 *Nuevo reporte de comando*`,
      ``,
      `*Comando:* /${command}`,
      `*Usuario:* ${userId}`,
      `*Tipo:* ${category}`,
      ``,
      `*Mensaje:*`,
      `"${message}"`,
      screenshotLines,
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
