import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';

function extractUserId(req: any): number {
  const u = req.user;
  return u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id || 0;
}

@Controller('api/v1/ui/alerts')
@UseGuards(BearerAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  async list(@Req() req: any) {
    const userId = extractUserId(req);
    const alerts = await this.alerts.getAlerts(userId);
    return { ok: true, alerts };
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: any) {
    const userId = extractUserId(req);
    const alert = await this.alerts.getAlert(userId, id);
    return { ok: true, alert };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = extractUserId(req);
    await this.alerts.deleteAlert(userId, id);
    return { ok: true };
  }

  @Delete()
  async removeAll(@Req() req: any) {
    const userId = extractUserId(req);
    const count = await this.alerts.deleteAllAlerts(userId);
    return { ok: true, deleted: count };
  }
}
