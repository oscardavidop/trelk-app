import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportRateLimit } from '../../common/decorators/rate-limit.decorator';
import { extractUserId } from '../../common/utils/auth.utils';

@Controller('api/v1/ui/commands')
@UseGuards(BearerAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('my-reports')
  async myReports(
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.reports.getUserReports(extractUserId(req), limit, offset)) };
  }

  @Post(':command/report')
  @ReportRateLimit()
  async report(
    @Param('command') command: string,
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');

    let category: string;
    let message: string;
    let screenshots: string[] = [];
    let honeypot: string | undefined;

    if (req.isMultipart?.() || req.headers['content-type']?.includes('multipart')) {
      const parts = req.parts();
      const fields: Record<string, string> = {};
      const files: Array<{ filename: string; mimetype: string; data: Buffer }> = [];

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          files.push({
            filename: part.filename,
            mimetype: part.mimetype,
            data: Buffer.concat(chunks),
          });
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      category = fields.category || '';
      message = fields.message || '';
      honeypot = fields._hp;

      if (files.length > 0) {
        screenshots = await this.reports.uploadReportScreenshots(files);
      }
    } else {
      const body = req.body || {};
      category = body.category || '';
      message = body.message || '';
      honeypot = body._hp;
    }

    if (!category?.trim()) throw new BadRequestException('category required');
    if (!message?.trim()) throw new BadRequestException('message required');

    if (honeypot) throw new BadRequestException('Invalid submission');

    const ip = (req.ip || req.headers?.['x-forwarded-for'] || '') as string;
    const userAgent = req.headers?.['user-agent'] || '';

    await this.reports.submitReport(
      extractUserId(req),
      command,
      category,
      message,
      ip,
      screenshots,
      userAgent,
    );
    return { ok: true };
  }

  @Get(':command/report-stats')
  async reportStats(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.reports.getReportStats(command)) };
  }

  @Get(':command/my-report-status')
  async myReportStatus(@Req() req: any, @Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const userId = extractUserId(req);
    const reported = await this.reports.hasUserReported(userId, command);
    return { ok: true, reported };
  }

  @Get('reports/:reportId/timeline')
  async reportTimeline(
    @Param('reportId') reportId: string,
    @Query('limit') limitStr: string,
    @Query('before') beforeStr: string,
    @Req() req: any,
  ) {
    if (!reportId) throw new BadRequestException('reportId is required');
    const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 100);
    const before = parseInt(beforeStr) || undefined;
    const timeline = await this.reports.getReportTimeline(extractUserId(req), reportId, limit, before);
    return { ok: true, ...timeline };
  }

  @Get('reports/:reportId')
  async reportDetail(
    @Param('reportId') reportId: string,
    @Req() req: any,
  ) {
    if (!reportId) throw new BadRequestException('reportId is required');
    const report = await this.reports.getReportDetail(extractUserId(req), reportId);
    return { ok: true, report };
  }

  @Post('reviews/:id/report')
  async reportReview(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.reports.reportReview(extractUserId(req), id, body.reason || 'spam');
    return { ok: true };
  }
}
