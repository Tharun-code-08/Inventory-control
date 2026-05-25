import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Double-submit anti-CSRF protection for cookie-authenticated endpoints. Browsers
 * cannot read the httpOnly refresh cookie, but they CAN automatically include it
 * in cross-site requests. To prove the request originated from the same-site SPA
 * (and not from a malicious page), the client also sets a non-httpOnly companion
 * cookie which it echoes in an `X-CSRF-Token` header. A cross-site attacker can
 * trigger the cookie but cannot read the cookie to forge the matching header.
 *
 * Apply this guard with `@UseGuards(CsrfGuard)` on cookie-based routes such as
 * `/auth/refresh` and `/auth/logout`.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { signedCookies?: Record<string, string> }>();

    if (this.isOriginAllowed(req) === false) {
      throw new ForbiddenException('Origin not allowed for cookie-authenticated request');
    }

    const headerValue = req.headers[CSRF_HEADER_NAME];
    const cookieValue = (req.cookies?.[CSRF_COOKIE_NAME] ?? req.signedCookies?.[CSRF_COOKIE_NAME]) as
      | string
      | undefined;
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieValue || !headerToken) {
      throw new ForbiddenException('Missing CSRF token');
    }
    if (!this.timingSafeEqual(cookieValue, headerToken)) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }

  private timingSafeEqual(a: string, b: string) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  private isOriginAllowed(req: Request) {
    const origin = (req.headers.origin || req.headers.referer) as string | undefined;
    if (!origin) {
      // CLI / non-browser callers cannot be CSRF'd. Allow when no Origin/Referer is set.
      return true;
    }
    const allowList = this.config.get<string>('WEB_ORIGIN', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowList.length === 0) return true;
    try {
      const originUrl = new URL(origin);
      return allowList.some((entry) => {
        try {
          const entryUrl = new URL(entry);
          return entryUrl.origin === originUrl.origin;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
