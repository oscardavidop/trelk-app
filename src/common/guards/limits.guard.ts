// src/common/guards/limits.guard.ts
// NestJS guard that checks user's pro_features limits before allowing requests.
// Usage: @UseGuards(LimitsGuard) + @SetMetadata('limitPath', 'downloads_per_day')
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../modules/users/user.service';

export const LIMIT_PATH_KEY = 'limitPath';

@Injectable()
export class LimitsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitPath = this.reflector.getAllAndOverride<string>(LIMIT_PATH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no limit metadata, pass through
    if (!limitPath) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const telegramId =
      user?.authTelegram?.id ||
      user?.authUser?.telegramId ||
      user?.authUser?.id;

    if (!telegramId) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.userService.incrementLimit(telegramId, limitPath);
    if (!allowed) {
      throw new ForbiddenException(
        `Limit exceeded for ${limitPath}. Upgrade your plan for higher limits.`,
      );
    }

    return true;
  }
}
