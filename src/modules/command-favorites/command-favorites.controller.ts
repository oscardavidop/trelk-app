import {
  Controller, Get, Post, Delete, Patch,
  Query, Param, Body, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommandFavoritesService } from './command-favorites.service';

@Controller('api/v1/ui/command-favorites')
@UseGuards(CookieAuthGuard)
export class CommandFavoritesController {
  constructor(private readonly svc: CommandFavoritesService) {}

  /** GET / — paginated favorites list */
  @Get()
  async list(
    @Query('offset') offsetStr: string,
    @Query('limit') limitStr: string,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    const offset = parseInt(offsetStr) || 0;
    const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 100);
    const result = await this.svc.getFavorites(this.uid(req), offset, limit, search || undefined);
    return { ok: true, ...result };
  }

  /** GET /set — all favorite command names (for bulk isFavorite check) */
  @Get('set')
  async getSet(@Req() req: any) {
    const commands = await this.svc.getFavoriteSet(this.uid(req));
    return { ok: true, commands };
  }

  /** POST /toggle — add or remove favorite */
  @Post('toggle')
  async toggle(@Body() body: { command: string }, @Req() req: any) {
    if (!body.command?.trim()) throw new BadRequestException('command required');
    const result = await this.svc.toggle(this.uid(req), body.command);
    return { ok: true, ...result };
  }

  /** DELETE /:command — remove specific favorite */
  @Delete(':command')
  async remove(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    await this.svc.remove(this.uid(req), command);
    return { ok: true };
  }

  /** PATCH /:command/pin — toggle pin */
  @Patch(':command/pin')
  async togglePin(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const result = await this.svc.togglePin(this.uid(req), command);
    return { ok: true, ...result };
  }

  /** GET /trending — top favorited commands this week */
  @Get('trending')
  async trending(@Query('limit') limitStr: string) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const items = await this.svc.getTrending(limit);
    return { ok: true, items };
  }

  /** GET /most-favorited — most favorited commands overall */
  @Get('most-favorited')
  async mostFavorited(@Query('limit') limitStr: string) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const items = await this.svc.getMostFavorited(limit);
    return { ok: true, items };
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
