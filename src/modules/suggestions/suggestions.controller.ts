import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuggestionsService } from './suggestions.service';

@Controller('api/v1/ui/suggestions')
@UseGuards(BearerAuthGuard)
export class SuggestionsController {
  constructor(private readonly svc: SuggestionsService) {}

  /** POST / — create a suggestion */
  @Post()
  async create(
    @Body() body: { title: string; description: string },
    @Req() req: any,
  ) {
    const result = await this.svc.create(this.uid(req), body.title, body.description);
    return { ok: true, ...result };
  }

  /** GET / — list suggestions */
  @Get()
  async list(
    @Query('sort') sort: string,
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Query('status') status: string,
    @Req() req: any,
  ) {
    const sortVal = ['trending', 'top', 'new'].includes(sort) ? sort : 'trending';
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    const result = await this.svc.list(sortVal as any, limit, offset, status, this.uid(req));
    return { ok: true, ...result };
  }

  /** GET /similar?title=... — find similar suggestions */
  @Get('similar')
  async similar(@Query('title') title: string) {
    if (!title?.trim()) throw new BadRequestException('title required');
    return { ok: true, ...(await this.svc.findSimilar(title)) };
  }

  /** GET /:id — get suggestion detail */
  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const suggestion = await this.svc.getById(id, this.uid(req));
    return { ok: true, suggestion };
  }

  /** POST /:id/vote — toggle vote */
  @Post(':id/vote')
  async vote(@Param('id') id: string, @Req() req: any) {
    return { ok: true, ...(await this.svc.toggleVote(this.uid(req), id)) };
  }

  /** POST /:id/comment — add comment */
  @Post(':id/comment')
  async comment(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return { ok: true, ...(await this.svc.addComment(this.uid(req), id, body.content)) };
  }

  /** GET /:id/comments — get comments */
  @Get(':id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 50);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.svc.getComments(id, limit, offset)) };
  }

  /** POST /:id/status — admin update status */
  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; adminNote?: string },
    @Req() req: any,
  ) {
    return await this.svc.updateStatus(this.uid(req), id, body.status as any, body.adminNote);
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
