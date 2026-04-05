import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { SecurityProfile, SecurityProfileDocument } from './schemas/security-profile.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RECOVERY_MAX_ATTEMPTS = 5;
const RECOVERY_LOCK_MINUTES = 30;
const BCRYPT_ROUNDS = 10;
const MIN_ANSWER_LENGTH = 2;

/** Valid question IDs — frontend translates via i18n */
export const VALID_QUESTION_IDS = [
  'pet_name',
  'birth_city',
  'favorite_food',
  'first_school',
  'mother_name',
  'favorite_movie',
] as const;

export type QuestionId = (typeof VALID_QUESTION_IDS)[number];
const SESSION_TTL = 1800; // 30 min

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectModel(SecurityProfile.name)
    private readonly profileModel: Model<SecurityProfileDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  /** Get or create security profile */
  async getProfile(telegramId: number): Promise<SecurityProfileDocument> {
    let profile = await this.profileModel.findOne({ telegramId }).exec();
    if (!profile) {
      profile = await this.profileModel.create({ telegramId });
    }
    return profile;
  }

  /** Get PIN status (safe for frontend) */
  async getStatus(telegramId: number) {
    const profile = await this.getProfile(telegramId);
    const verified = await this.isSessionVerified(telegramId);
    return {
      pinEnabled: profile.pinEnabled,
      isLocked: profile.lockedUntil ? new Date() < profile.lockedUntil : false,
      lockedUntil: profile.lockedUntil,
      lockAfterMinutes: profile.lockAfterMinutes,
      verified,
      failedAttempts: profile.failedAttempts,
      hasSecurityQuestions: profile.securityQuestions?.length === 3,
    };
  }

  /** Set a new PIN (or update existing) */
  async setPin(telegramId: number, pin: string, currentPin?: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }

    const profile = await this.getProfile(telegramId);

    // If PIN already set, require current PIN to change it
    if (profile.pinEnabled && profile.pinHash) {
      if (!currentPin) {
        throw new BadRequestException('CURRENT_PIN_REQUIRED');
      }
      const valid = await bcrypt.compare(currentPin, profile.pinHash);
      if (!valid) {
        throw new ForbiddenException('PIN_INCORRECT');
      }
    }

    const hash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await this.profileModel.updateOne(
      { telegramId },
      {
        $set: {
          pinHash: hash,
          pinEnabled: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
      },
    );

    // Mark session as verified after setting PIN
    await this.markSessionVerified(telegramId);
    this.logger.log(`PIN set for user ${telegramId}`);
  }

  /** Verify PIN and return success/failure */
  async verifyPin(telegramId: number, pin: string): Promise<{ success: boolean; attemptsLeft?: number }> {
    const profile = await this.getProfile(telegramId);

    if (!profile.pinEnabled) {
      return { success: true };
    }

    // Check lock
    if (profile.lockedUntil && new Date() < profile.lockedUntil) {
      throw new ForbiddenException('ACCOUNT_LOCKED');
    }

    const valid = await bcrypt.compare(pin, profile.pinHash);

    if (valid) {
      await this.profileModel.updateOne(
        { telegramId },
        { $set: { failedAttempts: 0, lockedUntil: null, lastVerifiedAt: new Date() } },
      );
      await this.markSessionVerified(telegramId);
      return { success: true };
    }

    // Failed attempt
    const attempts = profile.failedAttempts + 1;
    const update: any = { $set: { failedAttempts: attempts } };

    if (attempts >= MAX_ATTEMPTS) {
      update.$set.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      this.logger.warn(`User ${telegramId} locked after ${MAX_ATTEMPTS} failed PIN attempts`);
    }

    await this.profileModel.updateOne({ telegramId }, update);
    return { success: false, attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts) };
  }

  /** Disable PIN */
  async disablePin(telegramId: number, pin: string): Promise<{ attemptsLeft?: number }> {
    const profile = await this.getProfile(telegramId);

    if (!profile.pinEnabled) return {};

    // Check lock
    if (profile.lockedUntil && new Date() < profile.lockedUntil) {
      throw new ForbiddenException('ACCOUNT_LOCKED');
    }

    const valid = await bcrypt.compare(pin, profile.pinHash);

    if (!valid) {
      // Track failed attempt
      const attempts = profile.failedAttempts + 1;
      const update: any = { $set: { failedAttempts: attempts } };

      if (attempts >= MAX_ATTEMPTS) {
        update.$set.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        this.logger.warn(`User ${telegramId} locked after ${MAX_ATTEMPTS} failed disable-PIN attempts`);
      }

      await this.profileModel.updateOne({ telegramId }, update);
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attempts);

      if (attempts >= MAX_ATTEMPTS) {
        throw new ForbiddenException('ACCOUNT_LOCKED');
      }
      throw new ForbiddenException('PIN_INCORRECT');
    }

    await this.profileModel.updateOne(
      { telegramId },
      { $set: { pinEnabled: false, pinHash: '', failedAttempts: 0, lockedUntil: null } },
    );
    await this.clearSession(telegramId);
    this.logger.log(`PIN disabled for user ${telegramId}`);
    return {};
  }

  /** Update lock timeout setting */
  async updateSettings(telegramId: number, lockAfterMinutes: number): Promise<void> {
    if (lockAfterMinutes < 0 || lockAfterMinutes > 60) {
      throw new BadRequestException('LOCK_MINUTES_INVALID');
    }
    await this.profileModel.updateOne(
      { telegramId },
      { $set: { lockAfterMinutes } },
    );
  }

  // ── Session management (Redis-backed) ──

  async isSessionVerified(telegramId: number): Promise<boolean> {
    const key = `pin:session:${telegramId}`;
    const val = await this.redis.get<string>(key);
    return val === 'verified';
  }

  private async markSessionVerified(telegramId: number): Promise<void> {
    const key = `pin:session:${telegramId}`;
    await this.redis.set(key, 'verified', SESSION_TTL);
  }

  private async clearSession(telegramId: number): Promise<void> {
    await this.redis.del(`pin:session:${telegramId}`);
  }

  // ── Security Questions ──

  /** Normalize answer: lowercase, trim, collapse whitespace */
  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /** Save 3 security questions with hashed answers */
  async setSecurityQuestions(
    telegramId: number,
    questions: { questionId: string; answer: string }[],
  ): Promise<void> {
    if (questions.length !== 3) {
      throw new BadRequestException('QUESTIONS_MUST_BE_3');
    }

    const ids = questions.map((q) => q.questionId);
    if (new Set(ids).size !== 3) {
      throw new BadRequestException('QUESTIONS_MUST_BE_UNIQUE');
    }

    for (const q of questions) {
      if (!VALID_QUESTION_IDS.includes(q.questionId as any)) {
        throw new BadRequestException('QUESTION_ID_INVALID');
      }
      const normalized = this.normalizeAnswer(q.answer);
      if (normalized.length < MIN_ANSWER_LENGTH) {
        throw new BadRequestException('ANSWER_TOO_SHORT');
      }
      if (/^(\d)\1*$/.test(normalized) || /^(012|123|1234|abc|password)$/i.test(normalized)) {
        throw new BadRequestException('ANSWER_TOO_TRIVIAL');
      }
    }

    const hashed = await Promise.all(
      questions.map(async (q) => ({
        questionId: q.questionId,
        answerHash: await bcrypt.hash(this.normalizeAnswer(q.answer), BCRYPT_ROUNDS),
      })),
    );

    await this.profileModel.updateOne(
      { telegramId },
      { $set: { securityQuestions: hashed } },
    );

    this.logger.log(`Security questions set for user ${telegramId}`);
  }

  /** Get question IDs the user has set (no answers) */
  async getSecurityQuestionIds(telegramId: number): Promise<string[]> {
    const profile = await this.getProfile(telegramId);
    return (profile.securityQuestions || []).map((q) => q.questionId);
  }

  /** Verify recovery answers and allow PIN reset */
  async verifyRecoveryAnswers(
    telegramId: number,
    answers: { questionId: string; answer: string }[],
  ): Promise<{ success: boolean; attemptsLeft?: number }> {
    const profile = await this.getProfile(telegramId);

    if (!profile.securityQuestions || profile.securityQuestions.length !== 3) {
      throw new BadRequestException('NO_SECURITY_QUESTIONS');
    }

    // Check recovery lock
    if (profile.recoveryLockedUntil && new Date() < profile.recoveryLockedUntil) {
      throw new ForbiddenException('RECOVERY_LOCKED');
    }

    if (answers.length !== 3) {
      throw new BadRequestException('ANSWERS_MUST_BE_3');
    }

    // Verify all 3 answers
    let allCorrect = true;
    for (const sq of profile.securityQuestions) {
      const submitted = answers.find((a) => a.questionId === sq.questionId);
      if (!submitted) {
        allCorrect = false;
        break;
      }
      const normalized = this.normalizeAnswer(submitted.answer);
      const match = await bcrypt.compare(normalized, sq.answerHash);
      if (!match) {
        allCorrect = false;
        break;
      }
    }

    if (allCorrect) {
      // Reset recovery attempts, grant a short-lived recovery token in Redis
      await this.profileModel.updateOne(
        { telegramId },
        { $set: { recoveryFailedAttempts: 0, recoveryLockedUntil: null } },
      );
      await this.redis.set(`pin:recovery:${telegramId}`, 'granted', 300); // 5 min window
      this.logger.log(`Recovery verified for user ${telegramId}`);
      return { success: true };
    }

    // Failed attempt with progressive delay
    const attempts = (profile.recoveryFailedAttempts || 0) + 1;
    const update: any = { $set: { recoveryFailedAttempts: attempts } };

    if (attempts >= RECOVERY_MAX_ATTEMPTS) {
      update.$set.recoveryLockedUntil = new Date(
        Date.now() + RECOVERY_LOCK_MINUTES * 60 * 1000,
      );
      this.logger.warn(
        `User ${telegramId} recovery locked after ${RECOVERY_MAX_ATTEMPTS} failed attempts`,
      );
    }

    await this.profileModel.updateOne({ telegramId }, update);

    if (attempts >= RECOVERY_MAX_ATTEMPTS) {
      throw new ForbiddenException('RECOVERY_LOCKED');
    }

    return { success: false, attemptsLeft: Math.max(0, RECOVERY_MAX_ATTEMPTS - attempts) };
  }

  /** Reset PIN after successful recovery verification */
  async resetPinAfterRecovery(telegramId: number, newPin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new BadRequestException('PIN_INVALID_FORMAT');
    }

    // Check recovery grant in Redis
    const grant = await this.redis.get<string>(`pin:recovery:${telegramId}`);
    if (grant !== 'granted') {
      throw new ForbiddenException('RECOVERY_NOT_VERIFIED');
    }

    const hash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    await this.profileModel.updateOne(
      { telegramId },
      {
        $set: {
          pinHash: hash,
          pinEnabled: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
      },
    );

    // Consume recovery grant
    await this.redis.del(`pin:recovery:${telegramId}`);
    await this.markSessionVerified(telegramId);
    this.logger.log(`PIN reset via recovery for user ${telegramId}`);
  }
}
