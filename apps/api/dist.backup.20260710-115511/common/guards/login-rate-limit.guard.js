"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginRateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
let LoginRateLimitGuard = class LoginRateLimitGuard {
    MAX_FAILED_ATTEMPTS = 5;
    LOCK_DURATION_MS = 15 * 60 * 1000;
    RESET_AFTER_MS = 30 * 60 * 1000;
    attempts = new Map();
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const body = request.body;
        if (!body?.email) {
            return true;
        }
        const key = body.email.toLowerCase();
        const now = Date.now();
        let attempt = this.attempts.get(key);
        if (attempt?.lockedUntil && now < attempt.lockedUntil) {
            const remainingMs = attempt.lockedUntil - now;
            const remainingMinutes = Math.ceil(remainingMs / 60_000);
            throw new common_1.BadRequestException(`Too many failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`);
        }
        if (!attempt || now - attempt.firstAttemptTime > this.RESET_AFTER_MS) {
            attempt = {
                count: 0,
                firstAttemptTime: now,
            };
            this.attempts.set(key, attempt);
        }
        else {
            this.cleanupOldEntries(now);
        }
        return true;
    }
    recordFailedAttempt(email) {
        const key = email.toLowerCase();
        const now = Date.now();
        let attempt = this.attempts.get(key);
        if (!attempt || now - attempt.firstAttemptTime > this.RESET_AFTER_MS) {
            attempt = {
                count: 1,
                firstAttemptTime: now,
            };
        }
        else {
            attempt.count++;
            if (attempt.count >= this.MAX_FAILED_ATTEMPTS) {
                attempt.lockedUntil = now + this.LOCK_DURATION_MS;
            }
        }
        this.attempts.set(key, attempt);
    }
    recordSuccessfulAttempt(email) {
        const key = email.toLowerCase();
        this.attempts.delete(key);
    }
    getRemainingLockTime(email) {
        const key = email.toLowerCase();
        const attempt = this.attempts.get(key);
        if (!attempt?.lockedUntil) {
            return 0;
        }
        const remaining = attempt.lockedUntil - Date.now();
        return remaining > 0 ? remaining : 0;
    }
    cleanupOldEntries(now) {
        const threshold = now - this.RESET_AFTER_MS - 60_000;
        for (const [key, attempt] of this.attempts.entries()) {
            if (attempt.firstAttemptTime < threshold) {
                this.attempts.delete(key);
            }
        }
    }
};
exports.LoginRateLimitGuard = LoginRateLimitGuard;
exports.LoginRateLimitGuard = LoginRateLimitGuard = __decorate([
    (0, common_1.Injectable)()
], LoginRateLimitGuard);
//# sourceMappingURL=login-rate-limit.guard.js.map