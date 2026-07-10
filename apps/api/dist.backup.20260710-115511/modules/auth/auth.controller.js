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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const csrf_guard_1 = require("../../common/guards/csrf.guard");
const login_rate_limit_guard_1 = require("../../common/guards/login-rate-limit.guard");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const avatar_multer_options_1 = require("../../common/upload/avatar-multer.options");
const auth_service_1 = require("./auth.service");
const invite_service_1 = require("./invite.service");
const mfa_service_1 = require("./mfa.service");
const password_reset_service_1 = require("./password-reset.service");
const signup_service_1 = require("./signup.service");
const login_dto_1 = require("./dto/login.dto");
const signup_request_dto_1 = require("./dto/signup-request.dto");
const signup_resend_dto_1 = require("./dto/signup-resend.dto");
const signup_verify_dto_1 = require("./dto/signup-verify.dto");
const signup_complete_paid_dto_1 = require("./dto/signup-complete-paid.dto");
const signup_finalize_dto_1 = require("./dto/signup-finalize.dto");
const mobile_logout_dto_1 = require("./dto/mobile-logout.dto");
const mobile_refresh_dto_1 = require("./dto/mobile-refresh.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_password_dto_1 = require("./dto/update-password.dto");
const platform_express_1 = require("@nestjs/platform-express");
const invite_token_dto_1 = require("./dto/invite-token.dto");
const invite_accept_dto_1 = require("./dto/invite-accept.dto");
const request_password_reset_dto_1 = require("./dto/request-password-reset.dto");
const password_reset_link_token_dto_1 = require("./dto/password-reset-link-token.dto");
const complete_password_reset_link_dto_1 = require("./dto/complete-password-reset-link.dto");
const complete_password_reset_otp_dto_1 = require("./dto/complete-password-reset-otp.dto");
const mfa_challenge_token_dto_1 = require("./dto/mfa-challenge-token.dto");
const mfa_enroll_verify_dto_1 = require("./dto/mfa-enroll-verify.dto");
const mfa_login_verify_dto_1 = require("./dto/mfa-login-verify.dto");
const mfa_settings_verify_dto_1 = require("./dto/mfa-settings-verify.dto");
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const TRUSTED_MFA_COOKIE_NAME = 'remember_me';
const COOKIE_CONSENT_NAME = 'cookie_consent';
let AuthController = class AuthController {
    auth;
    signup;
    invite;
    mfa;
    passwordReset;
    config;
    loginRateLimitGuard;
    constructor(auth, signup, invite, mfa, passwordReset, config, loginRateLimitGuard) {
        this.auth = auth;
        this.signup = signup;
        this.invite = invite;
        this.mfa = mfa;
        this.passwordReset = passwordReset;
        this.config = config;
        this.loginRateLimitGuard = loginRateLimitGuard;
    }
    cookieName() {
        return this.config.get('REFRESH_COOKIE_NAME', 'session_id');
    }
    isProd() {
        return this.config.get('NODE_ENV') === 'production';
    }
    resolvedSameSite() {
        const configured = this.config.get('AUTH_COOKIE_SAME_SITE')?.toLowerCase();
        if (configured === 'none' || configured === 'strict' || configured === 'lax')
            return configured;
        return this.isProd() ? 'none' : 'lax';
    }
    refreshCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
        const sameSite = this.resolvedSameSite();
        const secure = sameSite === 'none' ? true : this.isProd();
        return {
            httpOnly: true,
            secure,
            sameSite,
            path: REFRESH_COOKIE_PATH,
            maxAge: maxAgeMs,
            signed: Boolean(this.config.get('COOKIE_SECRET')?.trim()),
        };
    }
    trustedMfaTtlMs() {
        const days = Number(this.config.get('MFA_TRUSTED_DEVICE_DAYS') ?? 7);
        return Math.max(1, days) * 24 * 60 * 60 * 1000;
    }
    trustedMfaCookieOptions(maxAgeMs = this.trustedMfaTtlMs()) {
        const sameSite = this.resolvedSameSite();
        const secure = sameSite === 'none' ? true : this.isProd();
        return {
            httpOnly: true,
            secure,
            sameSite,
            path: REFRESH_COOKIE_PATH,
            maxAge: maxAgeMs,
            signed: Boolean(this.config.get('COOKIE_SECRET')?.trim()),
        };
    }
    csrfCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
        const sameSite = this.resolvedSameSite();
        const secure = sameSite === 'none' ? true : this.isProd();
        return {
            httpOnly: false,
            secure,
            sameSite,
            path: '/',
            maxAge: maxAgeMs,
        };
    }
    writeAuthCookies(res, refreshToken) {
        res.cookie(this.cookieName(), refreshToken, this.refreshCookieOptions());
        const csrfToken = (0, crypto_1.randomUUID)();
        res.cookie(csrf_guard_1.CSRF_COOKIE_NAME, csrfToken, this.csrfCookieOptions());
    }
    writeTrustedMfaCookie(res, token) {
        res.cookie(TRUSTED_MFA_COOKIE_NAME, token, this.trustedMfaCookieOptions());
    }
    clearAuthCookies(res) {
        res.clearCookie(this.cookieName(), {
            ...this.refreshCookieOptions(0),
            maxAge: undefined,
        });
        res.clearCookie(csrf_guard_1.CSRF_COOKIE_NAME, {
            ...this.csrfCookieOptions(0),
            maxAge: undefined,
        });
    }
    clearTrustedMfaCookie(res) {
        res.clearCookie(TRUSTED_MFA_COOKIE_NAME, {
            ...this.trustedMfaCookieOptions(0),
            maxAge: undefined,
        });
    }
    readCookie(req, name) {
        const signed = req.signedCookies?.[name];
        const plain = req.cookies?.[name];
        return signed ?? plain;
    }
    hasFunctionalCookieConsent(req) {
        const raw = this.readCookie(req, COOKIE_CONSENT_NAME);
        if (!raw)
            return false;
        try {
            const parsed = JSON.parse(raw);
            return Boolean(parsed.functional);
        }
        catch {
            return raw === 'functional' || raw === 'all' || raw === 'true';
        }
    }
    async signupRequest(dto) {
        return this.signup.requestSignup(dto);
    }
    async signupResend(dto) {
        return this.signup.resendOtp(dto);
    }
    async signupVerify(req, dto) {
        return this.signup.verifySignup(dto, this.loginCtx(req));
    }
    async signupCompletePaid(req, dto) {
        return this.signup.completePaidSignup(dto, this.loginCtx(req));
    }
    async signupFinalize(req, dto, res) {
        const result = await this.signup.finalizeSignup(dto, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        return { accessToken: result.accessToken, user: result.user };
    }
    async invitePreview(query) {
        return this.invite.preview(query.token);
    }
    async inviteAccept(req, dto, res) {
        const result = await this.invite.accept(dto, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        return { accessToken: result.accessToken, user: result.user };
    }
    async mfaEnrollStart(dto) {
        return this.mfa.startEnrollment(dto.token);
    }
    async mfaEnrollRestart(req, dto) {
        return this.mfa.restartEnrollment(dto.token, this.loginCtx(req));
    }
    async mfaEnrollVerify(req, dto) {
        return this.mfa.verifyEnrollment(dto, this.loginCtx(req));
    }
    async mfaLoginVerify(req, dto, res) {
        const result = await this.mfa.verifyLogin(dto, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        if (this.hasFunctionalCookieConsent(req) &&
            'trustedDeviceToken' in result &&
            typeof result.trustedDeviceToken === 'string') {
            this.writeTrustedMfaCookie(res, result.trustedDeviceToken);
        }
        else {
            this.clearTrustedMfaCookie(res);
        }
        return { accessToken: result.accessToken, user: result.user };
    }
    async passwordResetRequest(req, dto) {
        return this.passwordReset.requestReset(dto, this.loginCtx(req));
    }
    async passwordResetLinkPreview(query) {
        return this.passwordReset.previewMagicLink(query.token);
    }
    async passwordResetLinkComplete(req, dto, res) {
        const result = await this.passwordReset.completeMagicLink(dto, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        return { accessToken: result.accessToken, user: result.user };
    }
    async passwordResetOtpComplete(req, dto, res) {
        const result = await this.passwordReset.completeOtp(dto, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        return { accessToken: result.accessToken, user: result.user };
    }
    async login(req, dto, res) {
        const ctx = this.loginCtx(req);
        try {
            const user = await this.auth.validateCredentials(dto);
            this.loginRateLimitGuard.recordSuccessfulAttempt(dto.email);
            if (user.mfaEnabled) {
                const hasFunctionalConsent = this.hasFunctionalCookieConsent(req);
                const trustedDeviceToken = hasFunctionalConsent
                    ? this.readCookie(req, TRUSTED_MFA_COOKIE_NAME)
                    : undefined;
                if (await this.mfa.verifyTrustedDevice(user.id, trustedDeviceToken, ctx)) {
                    const result = await this.auth.issueSessionForUser(user.id, ctx);
                    this.writeAuthCookies(res, result.refreshCookieValue);
                    return { accessToken: result.accessToken, user: result.user };
                }
                if (this.readCookie(req, TRUSTED_MFA_COOKIE_NAME)) {
                    this.clearTrustedMfaCookie(res);
                }
                return this.mfa.createLoginChallenge(user.id, user.email, ctx);
            }
            const result = await this.auth.issueSessionForUser(user.id, ctx);
            this.writeAuthCookies(res, result.refreshCookieValue);
            return { accessToken: result.accessToken, user: result.user };
        }
        catch (error) {
            this.loginRateLimitGuard.recordFailedAttempt(dto.email);
            throw error;
        }
    }
    loginCtx(req) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        return {
            ip: ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
            requestId: req?.requestId,
        };
    }
    mobileAuthResponse(result) {
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshCookieValue,
            user: result.user,
        };
    }
    async mobileLogin(req, dto) {
        const ctx = this.loginCtx(req);
        try {
            const user = await this.auth.validateCredentials(dto, ctx);
            this.loginRateLimitGuard.recordSuccessfulAttempt(dto.email);
            if (user.mfaEnabled) {
                return this.mfa.createLoginChallenge(user.id, user.email, ctx);
            }
            const result = await this.auth.issueSessionForUser(user.id, ctx);
            return this.mobileAuthResponse(result);
        }
        catch (error) {
            this.loginRateLimitGuard.recordFailedAttempt(dto.email);
            throw error;
        }
    }
    async mobileRefresh(req, dto) {
        const result = await this.auth.refreshFromToken(dto.refreshToken, this.loginCtx(req));
        return this.mobileAuthResponse(result);
    }
    async mobileLogout(user, dto) {
        const sessionId = await this.auth.getSessionIdFromRefreshToken(dto.refreshToken);
        await this.auth.logout(user.id, sessionId);
        return { ok: true };
    }
    async clearFunctionalCookies(res) {
        this.clearTrustedMfaCookie(res);
        return { ok: true };
    }
    async refresh(req, res) {
        const token = (req.cookies?.[this.cookieName()] ??
            req.signedCookies?.[this.cookieName()]);
        const result = await this.auth.refreshFromToken(token, this.loginCtx(req));
        this.writeAuthCookies(res, result.refreshCookieValue);
        return { accessToken: result.accessToken, user: result.user };
    }
    async logout(user, req, res) {
        const refreshToken = req.cookies?.[this.cookieName()];
        const signedRefreshToken = req.signedCookies?.[this.cookieName()];
        const sessionId = await this.auth.getSessionIdFromRefreshToken(refreshToken ?? signedRefreshToken);
        await this.auth.logout(user.id, sessionId);
        this.clearAuthCookies(res);
        return { ok: true };
    }
    async me(user) {
        return this.auth.me(user.id);
    }
    async mfaStatus(user) {
        return this.mfa.getStatus(user.id);
    }
    async mfaSettingsEnrollStart(user, req) {
        return this.mfa.startAccountEnrollment(user.id, this.loginCtx(req));
    }
    async mfaSettingsEnrollVerify(user, req, dto) {
        return this.mfa.verifyAccountEnrollment(user.id, dto, this.loginCtx(req));
    }
    async mfaSettingsRegenerateBackupCodes(user, dto) {
        return this.mfa.regenerateBackupCodes(user.id, dto);
    }
    async mfaSettingsDisable(user, dto, res) {
        const result = await this.mfa.disableAccountMfa(user.id, dto);
        this.clearTrustedMfaCookie(res);
        return result;
    }
    async updateProfile(user, dto, avatar) {
        return this.auth.updateProfile(user.id, dto, avatar);
    }
    async updatePassword(user, dto) {
        return this.auth.updatePassword(user.id, dto);
    }
    async listSessions(user) {
        return { sessions: await this.auth.listSessions(user.id) };
    }
    async revokeSession(user, sessionId) {
        const isAdmin = user.role === client_1.RoleName.OWNER || user.role === client_1.RoleName.ADMIN;
        return this.auth.revokeSession(user.id, sessionId, isAdmin);
    }
    async adminRevokeAll(actor, userId) {
        if (actor.role !== client_1.RoleName.OWNER && actor.role !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only an administrator can revoke another user');
        }
        return this.auth.revokeAllForUser(userId);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 5 } }),
    (0, common_1.Post)('signup/request'),
    (0, swagger_1.ApiOperation)({ summary: 'Start organisation signup — sends email OTP' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_request_dto_1.SignupRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupRequest", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('signup/resend'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend signup email OTP' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_resend_dto_1.SignupResendDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupResend", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('signup/verify'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify signup OTP and open a staged signup session',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        signup_verify_dto_1.SignupVerifyDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupVerify", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('signup/complete-paid'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify paid signup payment and continue to MFA without creating the account yet' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        signup_complete_paid_dto_1.SignupCompletePaidDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupCompletePaid", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('signup/finalize'),
    (0, swagger_1.ApiOperation)({ summary: 'Create the organisation and admin account only after signup MFA is complete' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        signup_finalize_dto_1.SignupFinalizeDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupFinalize", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Get)('invite'),
    (0, swagger_1.ApiOperation)({ summary: 'Preview invitation details (no auth)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_token_dto_1.InviteTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "invitePreview", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('invite/accept'),
    (0, swagger_1.ApiOperation)({ summary: 'Accept invitation, set password, and sign in' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        invite_accept_dto_1.InviteAcceptDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "inviteAccept", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('mfa/enroll/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Start TOTP enrollment after signup verification' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_challenge_token_dto_1.MfaChallengeTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaEnrollStart", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('mfa/enroll/restart'),
    (0, swagger_1.ApiOperation)({ summary: 'Restart signup TOTP enrollment with a new short-lived challenge' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, mfa_challenge_token_dto_1.MfaChallengeTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaEnrollRestart", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('mfa/enroll/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify TOTP enrollment and generate staged signup backup codes' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, mfa_enroll_verify_dto_1.MfaEnrollVerifyDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaEnrollVerify", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('mfa/login/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete a login MFA challenge with TOTP or backup code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        mfa_login_verify_dto_1.MfaLoginVerifyDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaLoginVerify", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 5 } }),
    (0, common_1.Post)('password-reset/request'),
    (0, swagger_1.ApiOperation)({ summary: 'Start forgot-password flow with email OTP or magic link' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, request_password_reset_dto_1.RequestPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "passwordResetRequest", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Get)('password-reset/link'),
    (0, swagger_1.ApiOperation)({ summary: 'Preview magic-link password reset' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_link_token_dto_1.PasswordResetLinkTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "passwordResetLinkPreview", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('password-reset/link/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete password reset using a magic link and sign in' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        complete_password_reset_link_dto_1.CompletePasswordResetLinkDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "passwordResetLinkComplete", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('password-reset/otp/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete password reset using an OTP and sign in' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request,
        complete_password_reset_otp_dto_1.CompletePasswordResetOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "passwordResetOtpComplete", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(login_rate_limit_guard_1.LoginRateLimitGuard),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({
        summary: 'Authenticate with email + password',
        description: 'On success: sets an httpOnly refresh-token cookie and a CSRF companion cookie, and returns a short-lived access token in the JSON body.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Login successful.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials.' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many login attempts.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(login_rate_limit_guard_1.LoginRateLimitGuard),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 10 } }),
    (0, common_1.Post)('mobile/login'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mobile: authenticate with email + password',
        description: 'Returns access and refresh tokens in the JSON body (no httpOnly cookies). For native Expo clients.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Login successful.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mobileLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 30 } }),
    (0, common_1.Post)('mobile/refresh'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mobile: rotate refresh token and return new access token',
        description: 'Accepts refresh token in JSON body. No CSRF cookie required.',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, mobile_refresh_dto_1.MobileRefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mobileRefresh", null);
__decorate([
    (0, common_1.Post)('mobile/logout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Mobile: revoke refresh session' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mobile_logout_dto_1.MobileLogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mobileLogout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('cookies/functional/clear'),
    (0, swagger_1.ApiOperation)({ summary: 'Clear functional cookies that require user consent' }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "clearFunctionalCookies", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60_000, limit: 30 } }),
    (0, common_1.UseGuards)(csrf_guard_1.CsrfGuard),
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({
        summary: 'Rotate the session cookie and return a new access token',
        description: 'Requires both the session cookie (set on login) and an `X-CSRF-Token` header matching the `csrf_token` cookie (double-submit anti-CSRF).',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Missing/invalid/replayed refresh token.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'CSRF token missing or invalid.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.UseGuards)(csrf_guard_1.CsrfGuard),
    (0, common_1.Post)('logout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke the current refresh token and clear cookies' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Return the current session user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('mfa/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Return the current user MFA status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaStatus", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('mfa/settings/enroll/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Start authenticator setup for the current user from settings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Request]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaSettingsEnrollStart", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('mfa/settings/enroll/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify authenticator setup for the current user and issue backup codes' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Request,
        mfa_enroll_verify_dto_1.MfaEnrollVerifyDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaSettingsEnrollVerify", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('mfa/settings/backup-codes/regenerate'),
    (0, swagger_1.ApiOperation)({ summary: 'Regenerate current user backup codes after TOTP confirmation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mfa_settings_verify_dto_1.MfaSettingsVerifyDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaSettingsRegenerateBackupCodes", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('mfa/settings/disable'),
    (0, swagger_1.ApiOperation)({ summary: 'Disable MFA for the current user after TOTP confirmation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mfa_settings_verify_dto_1.MfaSettingsVerifyDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaSettingsDisable", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the current user profile (and optional avatar upload)' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', avatar_multer_options_1.avatarMulterOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)('password'),
    (0, swagger_1.ApiOperation)({ summary: 'Change current user password (revokes any active refresh tokens)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_password_dto_1.UpdatePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePassword", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'List active refresh sessions for the current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "listSessions", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(csrf_guard_1.CsrfGuard),
    (0, common_1.Delete)('sessions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a specific refresh session (self or admin)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(csrf_guard_1.CsrfGuard),
    (0, require_permission_decorator_1.RequirePermission)('user:manage'),
    (0, common_1.Post)('users/:id/sessions/revoke-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: revoke all active sessions for a target user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminRevokeAll", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        signup_service_1.SignupService,
        invite_service_1.InviteService,
        mfa_service_1.MfaService,
        password_reset_service_1.PasswordResetService,
        config_1.ConfigService,
        login_rate_limit_guard_1.LoginRateLimitGuard])
], AuthController);
//# sourceMappingURL=auth.controller.js.map