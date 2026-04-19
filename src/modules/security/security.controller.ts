import {
  Controller, Get, Post, Patch, Body, Req, UseGuards, BadRequestException,
  Res,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityService, VALID_QUESTION_IDS } from './security.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

function extractUserId(req: any): number {
  const u = req.user;
  return u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id || 0;
}

@Controller('api/v1/ui/security')
@UseGuards(BearerAuthGuard)
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  /** GET /api/v1/ui/security/status — PIN status for current user */
  @Get('status')
  async getStatus(@Req() req: any) {
    const userId = extractUserId(req);
    const status = await this.security.getStatus(userId);
    return { ok: true, ...status };
  }

  /** POST /api/v1/ui/security/set-pin — Set or update PIN */
  @Post('set-pin')
  @RateLimit({ limit: 5, window: 300, keyType: 'user' })
  async setPin(@Req() req: any, @Body() body: { pin: string; currentPin?: string }) {
    const userId = extractUserId(req);
    if (!body.pin || typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }
    if (body.currentPin && (typeof body.currentPin !== 'string' || !/^\d{4,6}$/.test(body.currentPin))) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }
    await this.security.setPin(userId, body.pin, body.currentPin);
    return { ok: true };
  }

  /** POST /api/v1/ui/security/verify — Verify PIN to unlock */
  @Post('verify')
  @RateLimit({ limit: 10, window: 300, keyType: 'user' })
  async verifyPin(@Req() req: any, @Body() body: { pin: string }) {
    const userId = extractUserId(req);
    if (!body.pin || typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }
    const result = await this.security.verifyPin(userId, body.pin);
    return { ok: true, ...result };
  }

  /** POST /api/v1/ui/security/disable — Disable PIN */
  @Post('disable')
  @RateLimit({ limit: 5, window: 300, keyType: 'user' })
  async disablePin(@Req() req: any, @Body() body: { pin: string }) {
    const userId = extractUserId(req);
    if (!body.pin || typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }
    await this.security.disablePin(userId, body.pin);
    return { ok: true };
  }

  /** PATCH /api/v1/ui/security/settings — Update lock timeout */
  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() body: { lockAfterMinutes: number }) {
    const userId = extractUserId(req);
    const mins = Number(body.lockAfterMinutes);
    if (isNaN(mins) || mins < 0 || mins > 60) {
      throw new BadRequestException('LOCK_MINUTES_INVALID');
    }
    await this.security.updateSettings(userId, mins);
    return { ok: true };
  }

  // ── Security Questions ──

  /** GET /api/v1/ui/security/questions — Available question IDs */
  @Get('questions')
  getAvailableQuestions() {
    return { ok: true, questions: VALID_QUESTION_IDS };
  }

  /** POST /api/v1/ui/security/questions — Set 3 security questions */
  @Post('questions')
  @RateLimit({ limit: 5, window: 300, keyType: 'user' })
  async setQuestions(
    @Req() req: any,
    @Body() body: { questions: { questionId: string; answer: string }[] },
  ) {
    const userId = extractUserId(req);
    if (!Array.isArray(body.questions)) {
      throw new BadRequestException('QUESTIONS_MUST_BE_3');
    }
    for (const q of body.questions) {
      if (!q.questionId || typeof q.answer !== 'string') {
        throw new BadRequestException('QUESTION_ID_INVALID');
      }
    }
    await this.security.setSecurityQuestions(userId, body.questions);
    return { ok: true };
  }

  /** GET /api/v1/ui/security/my-questions — Get user's question IDs */
  @Get('my-questions')
  async getMyQuestions(@Req() req: any) {
    const userId = extractUserId(req);
    const questionIds = await this.security.getSecurityQuestionIds(userId);
    return { ok: true, questionIds };
  }

  // ── PIN Recovery ──

  /** POST /api/v1/ui/security/recovery/verify — Verify recovery answers */
  @Post('recovery/verify')
  @RateLimit({ limit: 5, window: 600, keyType: 'user' })
  async verifyRecovery(
    @Req() req: any,
    @Body() body: { answers: { questionId: string; answer: string }[] },
  ) {
    const userId = extractUserId(req);
    if (!Array.isArray(body.answers)) {
      throw new BadRequestException('ANSWERS_MUST_BE_3');
    }
    const result = await this.security.verifyRecoveryAnswers(userId, body.answers);
    return { ok: true, ...result };
  }

  /** POST /api/v1/ui/security/recovery/reset-pin — Reset PIN after verified recovery */
  @Post('recovery/reset-pin')
  @RateLimit({ limit: 3, window: 600, keyType: 'user' })
  async resetPinAfterRecovery(
    @Req() req: any,
    @Body() body: { pin: string },
  ) {
    const userId = extractUserId(req);
    if (!body.pin || typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }
    await this.security.resetPinAfterRecovery(userId, body.pin);
    return { ok: true };
  }
}
