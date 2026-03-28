import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('api/v1/ui/notifications')
@UseGuards(CookieAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** GET /api/v1/ui/notifications */
  @Get()
  async list(
    @Query('page') pageStr: string,
    @Query('limit') limitStr: string,
    @Query('unreadOnly') unreadOnlyStr: string,
    @Req() req: any,
  ) {
    const userId = this.uid(req);
    const page = Math.max(parseInt(pageStr) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const unreadOnly = unreadOnlyStr === 'true' || unreadOnlyStr === '1';

    const data = await this.notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
    });

    return { ok: true, ...data };
  }

  /** GET /api/v1/ui/notifications/unread-count */
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const userId = this.uid(req);
    const count = await this.notificationService.getUnreadCount(userId);
    return { ok: true, count };
  }

  /** PATCH /api/v1/ui/notifications/:id/read */
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = this.uid(req);
    if (!id || id.length < 10) {
      throw new BadRequestException('Invalid notification ID');
    }
    const success = await this.notificationService.markAsRead(id, userId);
    return { ok: success };
  }

  /** PATCH /api/v1/ui/notifications/read-all */
  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    const userId = this.uid(req);
    const count = await this.notificationService.markAllAsRead(userId);
    return { ok: true, count };
  }

  private uid(req: any): string {
    const u = req.user;
    return String(
      u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id,
    );
  }
}
