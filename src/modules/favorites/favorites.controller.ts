import {
  Controller, Get, Delete, Post, Patch, Param, Query, Body, Req, Res, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import type { FastifyReply } from 'fastify';
import { Readable } from 'stream';

@Controller('api/v1/ui/favorites')
@UseGuards(CookieAuthGuard)
export class FavoritesController {
  constructor(private readonly svc: FavoritesService) { }

  // ── Favorites ───────────────────────────────────

  @Get()
  async list(
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
    @Query('context') context: string,
    @Query('engine') engine: string,
    @Query('search') search: string,
    @Query('projections') projections: string,
    @Query('collectionId') collectionId: string,
    @Req() req: any,
  ) {
    const uid = this.uid(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 24, 1), 50);
    const result = await this.svc.findPaginated(uid, cursor || undefined, limit, {
      context: context || undefined,
      engine: engine || undefined,
      search: search || undefined,
      collectionId: collectionId || undefined,
      projections: projections || undefined,
    });
    return { ok: true, ...result };
  }

  @Get('filters')
  async filters(@Req() req: any) {
    return { ok: true, ...(await this.svc.getFilters(this.uid(req))) };
  }

  @Get('random')
  async random(@Query('limit') limitStr: string, @Req() req: any) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const items = await this.svc.getRandomFavorites(this.uid(req), limit);
    return { ok: true, items };
  }

  @Delete(':id')
  async deleteOne(@Param('id') id: string, @Req() req: any) {
    await this.svc.deleteById(id, this.uid(req));
    return { ok: true };
  }

  @Post('batch-delete')
  async batchDelete(@Body() body: { ids: string[] }, @Req() req: any) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) throw new BadRequestException('ids required');
    if (body.ids.length > 100) throw new BadRequestException('Max 100 ids');
    return { ok: true, ...(await this.svc.deleteBatch(body.ids, this.uid(req))) };
  }

  @Patch('move')
  async move(@Body() body: { ids: string[]; collectionId: string | null }, @Req() req: any) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) throw new BadRequestException('ids required');
    await this.svc.moveFavorites(body.ids, body.collectionId, this.uid(req));
    return { ok: true };
  }

  // ── Collections ─────────────────────────────────

  @Get('collections')
  async listCollections(@Req() req: any) {
    const items = await this.svc.getCollections(this.uid(req));
    return { ok: true, items };
  }

  @Post('collections')
  async createCollection(@Body() body: { name: string }, @Req() req: any) {
    if (!body.name?.trim()) throw new BadRequestException('name required');
    const item = await this.svc.createCollection(this.uid(req), body.name);
    return { ok: true, item };
  }

  @Patch('collections/:id')
  async updateCollection(@Param('id') id: string, @Body() body: { name: string }, @Req() req: any) {
    if (!body.name?.trim()) throw new BadRequestException('name required');
    const item = await this.svc.updateCollection(id, this.uid(req), body.name);
    return { ok: true, item };
  }

  @Delete('collections/:id')
  async deleteCollection(@Param('id') id: string, @Req() req: any) {
    await this.svc.deleteCollection(id, this.uid(req));
    return { ok: true };
  }

  // ── File proxy (SECURE — streams content, token never exposed) ──

  @Get('file/:fileId')
  async getFile(@Param('fileId') fileId: string, @Res() reply: FastifyReply) {
    if (!fileId) throw new BadRequestException('fileId required');

    const { stream, contentType, contentLength } = await this.svc.getFileStream(fileId);

    // Seteamos headers primero
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400, immutable');
    if (contentLength) reply.header('Content-Length', contentLength);

    // En Fastify, enviar un Node Stream es directo
    return reply.send(stream);
  }


  // ── Helper ──────────────────────────────────────

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
