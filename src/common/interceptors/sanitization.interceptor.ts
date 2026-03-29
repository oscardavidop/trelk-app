import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

const MAX_PAYLOAD_SIZE = 512 * 1024; // 512KB
const DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /\$\{.*\}/,        // Template injection
  /\$where/i,        // MongoDB injection
  /\$gt|(\$lt)/i,     // MongoDB operator injection in strings
];

/**
 * Global interceptor for input sanitization.
 * - Validates payload size
 * - Sanitizes string fields recursively
 * - Blocks dangerous patterns (XSS, injection)
 */
@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Check payload size
    const contentLength = parseInt(request.headers?.['content-length'] || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      throw new BadRequestException('Payload too large');
    }

    // Sanitize body
    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeObject(request.body);
    }

    // Sanitize query params
    if (request.query && typeof request.query === 'object') {
      request.query = this.sanitizeObject(request.query);
    }

    return next.handle();
  }

  private sanitizeObject(obj: any, depth = 0): any {
    if (depth > 10) return obj; // Prevent infinite recursion

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Block MongoDB operator injection in keys
        if (key.startsWith('$')) continue;
        sanitized[key] = this.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (!str) return str;

    // Trim and limit length
    let sanitized = str.trim();
    if (sanitized.length > 10000) {
      sanitized = sanitized.slice(0, 10000);
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        // Strip the dangerous content rather than rejecting
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Basic HTML entity encoding for < >
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return sanitized;
  }
}
