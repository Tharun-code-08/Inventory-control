"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRF_HEADER_NAME = exports.CSRF_COOKIE_NAME = exports.CsrfGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const CSRF_COOKIE_NAME = 'csrf_token';
exports.CSRF_COOKIE_NAME = CSRF_COOKIE_NAME;
const CSRF_HEADER_NAME = 'x-csrf-token';
exports.CSRF_HEADER_NAME = CSRF_HEADER_NAME;
let CsrfGuard = class CsrfGuard {
    config;
    constructor(config) {
        this.config = config;
    }
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        if (this.isOriginAllowed(req) === false) {
            throw new common_1.ForbiddenException('Origin not allowed for cookie-authenticated request');
        }
        const headerValue = req.headers[CSRF_HEADER_NAME];
        const cookieValue = (req.cookies?.[CSRF_COOKIE_NAME] ?? req.signedCookies?.[CSRF_COOKIE_NAME]);
        const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;
        if (!cookieValue || !headerToken) {
            throw new common_1.ForbiddenException('Missing CSRF token');
        }
        if (!this.timingSafeEqual(cookieValue, headerToken)) {
            throw new common_1.ForbiddenException('Invalid CSRF token');
        }
        return true;
    }
    timingSafeEqual(a, b) {
        if (a.length !== b.length)
            return false;
        let diff = 0;
        for (let i = 0; i < a.length; i += 1) {
            diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return diff === 0;
    }
    isOriginAllowed(req) {
        const origin = (req.headers.origin || req.headers.referer);
        if (!origin) {
            return true;
        }
        const allowList = this.config.get('WEB_ORIGIN', '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        if (allowList.length === 0)
            return true;
        try {
            const originUrl = new URL(origin);
            return allowList.some((entry) => {
                try {
                    const entryUrl = new URL(entry);
                    return entryUrl.origin === originUrl.origin;
                }
                catch {
                    return false;
                }
            });
        }
        catch {
            return false;
        }
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CsrfGuard);
//# sourceMappingURL=csrf.guard.js.map