import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { LiveService } from './live.service';

@Controller('api/v1/ui/live')
@SkipThrottle()
export class LiveController {
  constructor(private readonly live: LiveService) {}

  /** GET /api/v1/ui/live — real-time activity metrics (cached 10s) */
  @Get()
  async getMetrics() {
    const metrics = await this.live.getMetrics();
    return { ok: true, ...metrics };
  }
}
