import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { RequestContextRequest } from '../../common/types/request-context';
import { randomUUID } from 'crypto';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CSRF_COOKIE_NAME, CsrfGuard } from '../../common/guards/csrf.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { avatarMulterOptions } from '../../common/upload/avatar-multer.options';
import { AuthService } from './auth.service';
import { InviteService } from './invite.service';
import { MfaService } from './mfa.service';
import { PasswordResetService } from './password-reset.service';
import { SignupService } from './signup.service';
import { LoginDto } from './dto/login.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SignupResendDto } from './dto/signup-resend.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';
import { SignupCompletePaidDto } from './dto/signup-complete-paid.dto';
import { SignupFinalizeDto } from './dto/signup-finalize.dto';
import { MobileLogoutDto } from './dto/mobile-logout.dto';
import { MobileRefreshDto } from './dto/mobile-refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { InviteTokenDto } from './dto/invite-token.dto';
import { InviteAcceptDto } from './dto/invite-accept.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { PasswordResetLinkTokenDto } from './dto/password-reset-link-token.dto';
import { CompletePasswordResetLinkDto } from './dto/complete-password-reset-link.dto';
import { CompletePasswordResetOtpDto } from './dto/complete-password-reset-otp.dto';
import { MfaChallengeTokenDto } from './dto/mfa-challenge-token.dto';
import { MfaEnrollVerifyDto } from './dto/mfa-enroll-verify.dto';
import { MfaLoginVerifyDto } from './dto/mfa-login-verify.dto';
import { MfaSettingsVerifyDto } from './dto/mfa-settings-verify.dto';

const REFRESH_COOKIE_PATH = '/api/v1/auth';
const TRUSTED_MFA_COOKIE_NAME = 'remember_me';
const COOKIE_CONSENT_NAME = 'cookie_consent';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly signup: SignupService,
    private readonly invite: InviteService,
    private readonly mfa: MfaService,
    private readonly passwordReset: PasswordResetService,
    private readonly config: ConfigService,
  ) {}

  private cookieName() {
    return this.config.get<string>('REFRESH_COOKIE_NAME', 'session_id');
  }

  private isProd() {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private resolvedSameSite(): 'none' | 'strict' | 'lax' {
    const configured = this.config.get<string>('AUTH_COOKIE_SAME_SITE')?.toLowerCase();
    if (configured === 'none' || configured === 'strict' || configured === 'lax') return configured;
    return this.isProd() ? 'none' : 'lax';
  }

  private refreshCookieOptions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) {
    const sameSite = this.resolvedSameSite();
    const secure = sameSite === 'none' ? true : this.isProd();
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: REFRESH_COOKIE_PATH,
      maxAge: maxAgeMs,
      // Sign the cookie when COOKIE_SECRET is configured (set up in main.ts).
      signed: Boolean(this.config.get<string>('COOKIE_SECRET')?.trim()),
    };
  }

  private trustedMfaTtlMs() {
    const days = Number(this.config.get<string | number>('MFA_TRUSTED_DEVICE_DAYS') ?? 7);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  private trustedMfaCookieOptions(maxAgeMs: number = this.trustedMfaTtlMs()) {
    const sameSite = this.resolvedSameSite();
    const secure = sameSite === 'none' ? true : this.isProd();
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: REFRESH_COOKIE_PATH,
      maxAge: maxAgeMs,
      signed: Boolean(this.config.get<string>('COOKIE_SECRET')?.trim()),
    };
  }

  /**
   * Companion cookie for double-submit CSRF. Must NOT be httpOnly so the SPA
   * can read it and echo it back in the X-CSRF-Token header.
   */
  private csrfCookieOptions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) {
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

  private writeAuthCookies(res: Response, refreshToken: string) {
    res.cookie(this.cookieName(), refreshToken, this.refreshCookieOptions());
    const csrfToken = randomUUID();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, this.csrfCookieOptions());
  }

  private writeTrustedMfaCookie(res: Response, token: string) {
    res.cookie(TRUSTED_MFA_COOKIE_NAME, token, this.trustedMfaCookieOptions());
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(this.cookieName(), {
      ...this.refreshCookieOptions(0),
      maxAge: undefined as unknown as number,
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
      ...this.csrfCookieOptions(0),
      maxAge: undefined as unknown as number,
    });
  }

  private clearTrustedMfaCookie(res: Response) {
    res.clearCookie(TRUSTED_MFA_COOKIE_NAME, {
      ...this.trustedMfaCookieOptions(0),
      maxAge: undefined as unknown as number,
    });
  }

  private readCookie(req: any, name: string): string | undefined {
    const signed = (req.signedCookies as Record<string, string | undefined> | undefined)?.[name];
    const plain = (req.cookies as Record<string, string | undefined> | undefined)?.[name];
    return signed ?? plain;
  }

  private hasFunctionalCookieConsent(req: any) {
    const raw = this.readCookie(req, COOKIE_CONSENT_NAME);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { functional?: boolean };
      return Boolean(parsed.functional);
    } catch {
      return raw === 'functional' || raw === 'all' || raw === 'true';
    }
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @Post('signup/request')
  @ApiOperation({ summary: 'Start organisation signup — sends email OTP' })
  async signupRequest(@Body() dto: SignupRequestDto) {
    return this.signup.requestSignup(dto);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/resend')
  @ApiOperation({ summary: 'Resend signup email OTP' })
  async signupResend(@Body() dto: SignupResendDto) {
    return this.signup.resendOtp(dto);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/verify')
  @ApiOperation({
    summary: 'Verify signup OTP and open a staged signup session',
  })
  async signupVerify(
    @Req() req: Request,
    @Body() dto: SignupVerifyDto,
  ) {
    return this.signup.verifySignup(dto, this.loginCtx(req));
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/complete-paid')
  @ApiOperation({ summary: 'Verify paid signup payment and continue to MFA without creating the account yet' })
  async signupCompletePaid(
    @Req() req: Request,
    @Body() dto: SignupCompletePaidDto,
  ) {
    return this.signup.completePaidSignup(dto, this.loginCtx(req));
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/finalize')
  @ApiOperation({ summary: 'Create the organisation and admin account only after signup MFA is complete' })
  async signupFinalize(
    @Req() req: Request,
    @Body() dto: SignupFinalizeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.signup.finalizeSignup(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Get('invite')
  @ApiOperation({ summary: 'Preview invitation details (no auth)' })
  async invitePreview(@Query() query: InviteTokenDto) {
    return this.invite.preview(query.token);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept invitation, set password, and sign in' })
  async inviteAccept(
    @Req() req: Request,
    @Body() dto: InviteAcceptDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.invite.accept(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/start')
  @ApiOperation({ summary: 'Start TOTP enrollment after signup verification' })
  async mfaEnrollStart(@Body() dto: MfaChallengeTokenDto) {
    return this.mfa.startEnrollment(dto.token);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/restart')
  @ApiOperation({ summary: 'Restart signup TOTP enrollment with a new short-lived challenge' })
  async mfaEnrollRestart(@Req() req: Request, @Body() dto: MfaChallengeTokenDto) {
    return this.mfa.restartEnrollment(dto.token, this.loginCtx(req));
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/verify')
  @ApiOperation({ summary: 'Verify TOTP enrollment and generate staged signup backup codes' })
  async mfaEnrollVerify(@Req() req: Request, @Body() dto: MfaEnrollVerifyDto) {
    return this.mfa.verifyEnrollment(dto, this.loginCtx(req));
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/login/verify')
  @ApiOperation({ summary: 'Complete a login MFA challenge with TOTP or backup code' })
  async mfaLoginVerify(
    @Req() req: Request,
    @Body() dto: MfaLoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.mfa.verifyLogin(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    if (
      this.hasFunctionalCookieConsent(req) &&
      'trustedDeviceToken' in result &&
      typeof result.trustedDeviceToken === 'string'
    ) {
      this.writeTrustedMfaCookie(res, result.trustedDeviceToken);
    } else {
      this.clearTrustedMfaCookie(res);
    }
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @Post('password-reset/request')
  @ApiOperation({ summary: 'Start forgot-password flow with email OTP or magic link' })
  async passwordResetRequest(@Req() req: Request, @Body() dto: RequestPasswordResetDto) {
    return this.passwordReset.requestReset(dto, this.loginCtx(req));
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Get('password-reset/link')
  @ApiOperation({ summary: 'Preview magic-link password reset' })
  async passwordResetLinkPreview(@Query() query: PasswordResetLinkTokenDto) {
    return this.passwordReset.previewMagicLink(query.token);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('password-reset/link/complete')
  @ApiOperation({ summary: 'Complete password reset using a magic link and sign in' })
  async passwordResetLinkComplete(
    @Req() req: Request,
    @Body() dto: CompletePasswordResetLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passwordReset.completeMagicLink(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('password-reset/otp/complete')
  @ApiOperation({ summary: 'Complete password reset using an OTP and sign in' })
  async passwordResetOtpComplete(
    @Req() req: Request,
    @Body() dto: CompletePasswordResetOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passwordReset.completeOtp(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate with email + password',
    description:
      'On success: sets an httpOnly refresh-token cookie and a CSRF companion cookie, and returns a short-lived access token in the JSON body.',
  })
  @ApiResponse({ status: 201, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Too many login attempts.' })
  async login(@Req() req: Request, @Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const ctx = this.loginCtx(req);
    const user = await this.auth.validateCredentials(dto);
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

  private loginCtx(req: any) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip;
    return {
      ip: ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      requestId: (req as RequestContextRequest)?.requestId,
    };
  }

  private mobileAuthResponse(result: {
    accessToken: string;
    refreshCookieValue: string;
    user: unknown;
  }) {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshCookieValue,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mobile/login')
  @ApiOperation({
    summary: 'Mobile: authenticate with email + password',
    description:
      'Returns access and refresh tokens in the JSON body (no httpOnly cookies). For native Expo clients.',
  })
  @ApiResponse({ status: 201, description: 'Login successful.' })
  async mobileLogin(@Req() req: RequestContextRequest, @Body() dto: LoginDto) {
    const ctx = this.loginCtx(req);
    const user = await this.auth.validateCredentials(dto, ctx);
    if (user.mfaEnabled) {
      return this.mfa.createLoginChallenge(user.id, user.email, ctx);
    }
    const result = await this.auth.issueSessionForUser(user.id, ctx);
    return this.mobileAuthResponse(result);
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 30 } })
  @Post('mobile/refresh')
  @ApiOperation({
    summary: 'Mobile: rotate refresh token and return new access token',
    description: 'Accepts refresh token in JSON body. No CSRF cookie required.',
  })
  async mobileRefresh(@Req() req: Request, @Body() dto: MobileRefreshDto) {
    const result = await this.auth.refreshFromToken(dto.refreshToken, this.loginCtx(req));
    return this.mobileAuthResponse(result);
  }

  @Post('mobile/logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mobile: revoke refresh session' })
  async mobileLogout(
    @CurrentUser() user: RequestUser,
    @Body() dto: MobileLogoutDto,
  ) {
    const sessionId = await this.auth.getSessionIdFromRefreshToken(dto.refreshToken);
    await this.auth.logout(user.id, sessionId);
    return { ok: true };
  }

  @Public()
  @Post('cookies/functional/clear')
  @ApiOperation({ summary: 'Clear functional cookies that require user consent' })
  async clearFunctionalCookies(@Res({ passthrough: true }) res: Response) {
    this.clearTrustedMfaCookie(res);
    return { ok: true };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 30 } })
  @UseGuards(CsrfGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the session cookie and return a new access token',
    description:
      'Requires both the session cookie (set on login) and an `X-CSRF-Token` header matching the `csrf_token` cookie (double-submit anti-CSRF).',
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid/replayed refresh token.' })
  @ApiResponse({ status: 403, description: 'CSRF token missing or invalid.' })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies?.[this.cookieName()] ??
      req.signedCookies?.[this.cookieName()]) as
      | string
      | undefined;
    const result = await this.auth.refreshFromToken(token, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @UseGuards(CsrfGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current refresh token and clear cookies' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[this.cookieName()] as string | undefined;
    const signedRefreshToken = req.signedCookies?.[this.cookieName()];
    const sessionId = await this.auth.getSessionIdFromRefreshToken(refreshToken ?? signedRefreshToken);
    await this.auth.logout(user.id, sessionId);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Return the current session user' })
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @Get('mfa/status')
  @ApiOperation({ summary: 'Return the current user MFA status' })
  async mfaStatus(@CurrentUser() user: RequestUser) {
    return this.mfa.getStatus(user.id);
  }

  @ApiBearerAuth()
  @Post('mfa/settings/enroll/start')
  @ApiOperation({ summary: 'Start authenticator setup for the current user from settings' })
  async mfaSettingsEnrollStart(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.mfa.startAccountEnrollment(user.id, this.loginCtx(req));
  }

  @ApiBearerAuth()
  @Post('mfa/settings/enroll/verify')
  @ApiOperation({ summary: 'Verify authenticator setup for the current user and issue backup codes' })
  async mfaSettingsEnrollVerify(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Body() dto: MfaEnrollVerifyDto,
  ) {
    return this.mfa.verifyAccountEnrollment(user.id, dto, this.loginCtx(req));
  }

  @ApiBearerAuth()
  @Post('mfa/settings/backup-codes/regenerate')
  @ApiOperation({ summary: 'Regenerate current user backup codes after TOTP confirmation' })
  async mfaSettingsRegenerateBackupCodes(
    @CurrentUser() user: RequestUser,
    @Body() dto: MfaSettingsVerifyDto,
  ) {
    return this.mfa.regenerateBackupCodes(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('mfa/settings/disable')
  @ApiOperation({ summary: 'Disable MFA for the current user after TOTP confirmation' })
  async mfaSettingsDisable(
    @CurrentUser() user: RequestUser,
    @Body() dto: MfaSettingsVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.mfa.disableAccountMfa(user.id, dto);
    this.clearTrustedMfaCookie(res);
    return result;
  }

  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: 'Update the current user profile (and optional avatar upload)' })
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.auth.updateProfile(user.id, dto, avatar);
  }

  @ApiBearerAuth()
  @Patch('password')
  @ApiOperation({ summary: 'Change current user password (revokes any active refresh tokens)' })
  async updatePassword(@CurrentUser() user: RequestUser, @Body() dto: UpdatePasswordDto) {
    return this.auth.updatePassword(user.id, dto);
  }

  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active refresh sessions for the current user' })
  async listSessions(@CurrentUser() user: RequestUser) {
    return { sessions: await this.auth.listSessions(user.id) };
  }

  @ApiBearerAuth()
  @UseGuards(CsrfGuard)
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a specific refresh session (self or admin)' })
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) sessionId: string,
  ) {
    const isAdmin = user.role === RoleName.OWNER || user.role === RoleName.ADMIN;
    return this.auth.revokeSession(user.id, sessionId, isAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(CsrfGuard)
  @RequirePermission('user:manage')
  @Post('users/:id/sessions/revoke-all')
  @ApiOperation({ summary: 'Admin: revoke all active sessions for a target user' })
  async adminRevokeAll(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) userId: string,
  ) {
    if (actor.role !== RoleName.OWNER && actor.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only an administrator can revoke another user');
    }
    return this.auth.revokeAllForUser(userId);
  }
}
