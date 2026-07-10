"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditExportRateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
let AuditExportRateLimitGuard = class AuditExportRateLimitGuard {
    REQUESTS_PER_HOUR = 100;
    WINDOW_DURATION_MS = 60 * 60 * 1000;
    userQuotas = new Map();
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id) {
            return true;
        }
        const now = Date.now();
        const quota = this.userQuotas.get(user.id);
        if (!quota || now - quota.windowStartTime >= this.WINDOW_DURATION_MS) {
            this.userQuotas.set(user.id, {
                requestCount: 1,
                windowStartTime: now,
            });
            this.cleanupOldEntries(now);
            return true;
        }
        if (quota.requestCount >= this.REQUESTS_PER_HOUR) {
            const remainingMs = this.WINDOW_DURATION_MS - (now - quota.windowStartTime);
            const remainingMinutes = Math.ceil(remainingMs / 60_000);
            throw new common_1.BadRequestException(`Audit export limit exceeded. Maximum ${this.REQUESTS_PER_HOUR} exports per hour. ` +
                `Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`);
        }
        quota.requestCount++;
        return true;
    }
    cleanupOldEntries(now) {
        const threshold = now - this.WINDOW_DURATION_MS - 60_000;
        for (const [userId, quota] of this.userQuotas.entries()) {
            if (quota.windowStartTime < threshold) {
                this.userQuotas.delete(userId);
            }
        }
    }
    getRemaining(userId) {
        const quota = this.userQuotas.get(userId);
        if (!quota) {
            return this.REQUESTS_PER_HOUR;
        }
        const now = Date.now();
        if (now - quota.windowStartTime >= this.WINDOW_DURATION_MS) {
            return this.REQUESTS_PER_HOUR;
        }
        return Math.max(0, this.REQUESTS_PER_HOUR - quota.requestCount);
    }
    getRemainingWindowTime(userId) {
        const quota = this.userQuotas.get(userId);
        if (!quota) {
            return this.WINDOW_DURATION_MS;
        }
        const now = Date.now();
        const elapsed = now - quota.windowStartTime;
        if (elapsed >= this.WINDOW_DURATION_MS) {
            return this.WINDOW_DURATION_MS;
        }
        return this.WINDOW_DURATION_MS - elapsed;
    }
};
exports.AuditExportRateLimitGuard = AuditExportRateLimitGuard;
exports.AuditExportRateLimitGuard = AuditExportRateLimitGuard = __decorate([
    (0, common_1.Injectable)()
], AuditExportRateLimitGuard);
//# sourceMappingURL=audit-export-rate-limit.guard.js.map