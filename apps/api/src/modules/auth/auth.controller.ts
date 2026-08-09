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
import { LoginLockoutService } from '../../common/guards/login-rate-limit.guard';
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
    private readonly loginLockout: LoginLockoutService,
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
      signed: Boolean(this.config.get<string>('COOKIE_SECRET')?.trim()),
    };
  }

  private csrfCookieOptions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) {
    const sameSite = this.resolvedSameSite();
    const secure = sameSite === 'none' ? true : this.isProd();
    return { httpOnly: false, secure, sameSite, path: '/', maxAge: maxAgeMs };
  }

  private writeAuthCookies(res: Response, refreshToken: string) {
    res.cookie(this.cookieName(), refreshToken, this.refreshCookieOptions());
    res.cookie(CSRF_COOKIE_NAME, randomUUID(), this.csrfCookieOptions());
  }

  private writeTrustedMfaCookie(res: Response, token: string) {
    res.cookie(TRUSTED_MFA_COOKIE_NAME, token, this.trustedMfaCookieOptions());
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(this.cookieName(), { ...this.refreshCookieOptions(0), maxAge: undefined as unknown as number });
    res.clearCookie(CSRF_COOKIE_NAME, { ...this.csrfCookieOptions(0), maxAge: undefined as unknown as number });
  }

  private clearTrustedMfaCookie(res: Response) {
    res.clearCookie(TRUSTED_MFA_COOKIE_NAME, { ...this.trustedMfaCookieOptions(0), maxAge: undefined as unknown as number });
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
  async signupRequest(@Body() dto: SignupRequestDto) { return this.signup.requestSignup(dto); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/resend')
  @ApiOperation({ summary: 'Resend signup email OTP' })
  async signupResend(@Body() dto: SignupResendDto) { return this.signup.resendOtp(dto); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/verify')
  @ApiOperation({ summary: 'Verify signup OTP and open a staged signup session' })
  async signupVerify(@Req() req: Request, @Body() dto: SignupVerifyDto) { return this.signup.verifySignup(dto, this.loginCtx(req)); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/complete-paid')
  @ApiOperation({ summary: 'Verify paid signup payment and continue to MFA without creating the account yet' })
  async signupCompletePaid(@Req() req: Request, @Body() dto: SignupCompletePaidDto) { return this.signup.completePaidSignup(dto, this.loginCtx(req)); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('signup/finalize')
  @ApiOperation({ summary: 'Create the organisation and admin account only after signup MFA is complete' })
  async signupFinalize(@Req() req: Request, @Body() dto: SignupFinalizeDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.signup.finalizeSignup(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Get('invite')
  @ApiOperation({ summary: 'Preview invitation details (no auth)' })
  async invitePreview(@Query() query: InviteTokenDto) { return this.invite.preview(query.token); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept invitation, set password, and sign in' })
  async inviteAccept(@Req() req: Request, @Body() dto: InviteAcceptDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.invite.accept(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/start')
  @ApiOperation({ summary: 'Start TOTP enrollment after signup verification' })
  async mfaEnrollStart(@Body() dto: MfaChallengeTokenDto) { return this.mfa.startEnrollment(dto.token); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/restart')
  @ApiOperation({ summary: 'Restart signup TOTP enrollment with a new short-lived challenge' })
  async mfaEnrollRestart(@Req() req: Request, @Body() dto: MfaChallengeTokenDto) { return this.mfa.restartEnrollment(dto.token, this.loginCtx(req)); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/enroll/verify')
  @ApiOperation({ summary: 'Verify TOTP enrollment and generate staged signup backup codes' })
  async mfaEnrollVerify(@Req() req: Request, @Body() dto: MfaEnrollVerifyDto) { return this.mfa.verifyEnrollment(dto, this.loginCtx(req)); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('mfa/login/verify')
  @ApiOperation({ summary: 'Complete a login MFA challenge with TOTP or backup code' })
  async mfaLoginVerify(@Req() req: Request, @Body() dto: MfaLoginVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.mfa.verifyLogin(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    if (this.hasFunctionalCookieConsent(req) && 'trustedDeviceToken' in result && typeof result.trustedDeviceToken === 'string') this.writeTrustedMfaCookie(res, result.trustedDeviceToken);
    else this.clearTrustedMfaCookie(res);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @Post('password-reset/request')
  @ApiOperation({ summary: 'Start forgot-password flow with email OTP or magic link' })
  async passwordResetRequest(@Req() req: Request, @Body() dto: RequestPasswordResetDto) { return this.passwordReset.requestReset(dto, this.loginCtx(req)); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Get('password-reset/link')
  @ApiOperation({ summary: 'Preview magic-link password reset' })
  async passwordResetLinkPreview(@Query() query: PasswordResetLinkTokenDto) { return this.passwordReset.previewMagicLink(query.token); }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('password-reset/link/complete')
  @ApiOperation({ summary: 'Complete password reset using a magic link and sign in' })
  async passwordResetLinkComplete(@Req() req: Request, @Body() dto: CompletePasswordResetLinkDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.passwordReset.completeMagicLink(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('password-reset/otp/complete')
  @ApiOperation({ summary: 'Complete password reset using an OTP and sign in' })
  async passwordResetOtpComplete(@Req() req: Request, @Body() dto: CompletePasswordResetOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.passwordReset.completeOtp(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email + password', description: 'On success: sets an httpOnly refresh-token cookie and a CSRF companion cookie, and returns a short-lived access token in the JSON body.' })
  @ApiResponse({ status: 201, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Too many login attempts.' })
  async login(@Req() req: Request, @Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const ctx = this.loginCtx(req);
    await this.loginLockout.assertNotLocked(dto.email);
    try {
      const user = await this.auth.validateCredentials(dto);
      await this.loginLockout.recordSuccessfulAttempt(dto.email);
      if (user.mfaEnabled) {
        const hasFunctionalConsent = this.hasFunctionalCookieConsent(req);
        const trustedDeviceToken = hasFunctionalConsent ? this.readCookie(req, TRUSTED_MFA_COOKIE_NAME) : undefined;
        if (trustedDeviceToken) {
          const trusted = await this.mfa.verifyTrustedDevice(user.id, trustedDeviceToken, ctx);
          if (trusted) {
            const session = await this.auth.issueSessionForUser(user.id, ctx);
            this.writeAuthCookies(res, session.refreshCookieValue);
            this.clearTrustedMfaCookie(res);
            return { accessToken: session.accessToken, user: session.user };
          }
        }
        const challenge = await this.mfa.createLoginChallenge(user.id, user.email, ctx);
        this.clearAuthCookies(res);
        return challenge;
      }
      const session = await this.auth.issueSessionForUser(user.id, ctx);
      this.writeAuthCookies(res, session.refreshCookieValue);
      return { accessToken: session.accessToken, user: session.user };
    } catch (err) {
      await this.loginLockout.recordFailedAttempt(dto.email);
      throw err;
    }
  }

  private loginCtx(req: Request) {
    return {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? undefined,
    };
  }

  private trustedMfaCookieOptions(maxAgeMs: number = 90 * 24 * 60 * 60 * 1000) {
    const sameSite = this.resolvedSameSite();
    const secure = sameSite === 'none' ? true : this.isProd();
    return { httpOnly: true, secure, sameSite, path: '/', maxAge: maxAgeMs, signed: Boolean(this.config.get<string>('COOKIE_SECRET')?.trim()) };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: RequestUser) { return this.auth.me(user.id); }

  // Remaining controller methods are unchanged below this point.
