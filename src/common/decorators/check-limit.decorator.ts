// src/common/decorators/check-limit.decorator.ts
// Decorator to mark a route as requiring a specific limit check.
// Usage: @CheckLimit('downloads_per_day') on a controller method
import { SetMetadata } from '@nestjs/common';
import { LIMIT_PATH_KEY } from '../guards/limits.guard';

export const CheckLimit = (limitPath: string) => SetMetadata(LIMIT_PATH_KEY, limitPath);
