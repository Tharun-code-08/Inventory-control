import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
declare const CSRF_COOKIE_NAME = "csrf_token";
declare const CSRF_HEADER_NAME = "x-csrf-token";
export declare class CsrfGuard implements CanActivate {
    private readonly config;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
    private timingSafeEqual;
    private isOriginAllowed;
}
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
