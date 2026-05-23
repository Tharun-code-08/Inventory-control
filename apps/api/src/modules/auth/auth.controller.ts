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
import { Response, Request } from 'express';
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
import { SignupService } from './signup.service';
import { LoginDto } from './dto/login.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SignupResendDto } from './dto/signup-resend.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';
import { MobileLogoutDto } from './dto/mobile-logout.dto';
import { MobileRefreshDto } from './dto/mobile-refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { InviteTokenDto } from './dto/invite-token.dto';
import { InviteAcceptDto } from './dto/invite-accept.dto';

const REFRESH_COOKIE_PATH = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly signup: SignupService,
    private readonly invite: InviteService,
    private readonly config: ConfigService,
  ) {}

  private cookieName() {
    return this.config.get<string>('REFRESH_COOKIE_NAME', 'refreshToken');
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
  @ApiOperation({ summary: 'Verify signup OTP and create organisation workspace' })
  async signupVerify(
    @Req() req: Request,
    @Body() dto: SignupVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.signup.verifySignup(dto, this.loginCtx(req));
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
    const result = await this.auth.login(dto, this.loginCtx(req));
    this.writeAuthCookies(res, result.refreshCookieValue);
    return { accessToken: result.accessToken, user: result.user };
  }

  private loginCtx(req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip;
    return { ip: ip ?? null, userAgent: (req.headers['user-agent'] as string | undefined) ?? null };
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
  async mobileLogin(@Req() req: Request, @Body() dto: LoginDto) {
    const result = await this.auth.login(dto, this.loginCtx(req));
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
  @Throttle({ auth: { ttl: 60_000, limit: 30 } })
  @UseGuards(CsrfGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh-token cookie and return a new access token',
    description:
      'Requires both the refresh-token cookie (set on login) and an `X-CSRF-Token` header matching the `csrfToken` cookie (double-submit anti-CSRF).',
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid/replayed refresh token.' })
  @ApiResponse({ status: 403, description: 'CSRF token missing or invalid.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies?.[this.cookieName()] ??
      (req as Request & { signedCookies?: Record<string, string> }).signedCookies?.[this.cookieName()]) as
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
    @Req() req: Request & { signedCookies?: Record<string, string> },
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
    const isAdmin = user.role === RoleName.ADMIN;
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
    if (actor.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only an administrator can revoke another user');
    }
    return this.auth.revokeAllForUser(userId);
  }
}
