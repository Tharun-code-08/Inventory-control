import { Body, Controller, Get, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieName() {
    return this.config.get<string>('REFRESH_COOKIE_NAME', 'refreshToken');
  }

  private refreshCookieOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const sameSiteConfig = this.config.get<string>('AUTH_COOKIE_SAME_SITE')?.toLowerCase();
    const sameSite = sameSiteConfig === 'none' || sameSiteConfig === 'strict' || sameSiteConfig === 'lax'
      ? (sameSiteConfig as 'none' | 'strict' | 'lax')
      : (isProd ? 'none' : 'lax');
    const secure = sameSite === 'none' ? true : isProd;
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    res.cookie(this.cookieName(), result.refreshCookieValue, this.refreshCookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[this.cookieName()] as string | undefined;
    const result = await this.auth.refreshFromToken(token);
    res.cookie(this.cookieName(), result.refreshCookieValue, this.refreshCookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.id);
    res.clearCookie(this.cookieName(), { path: '/api/v1/auth' });
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.auth.updateProfile(user.id, dto, avatar);
  }

  @ApiBearerAuth()
  @Patch('password')
  async updatePassword(@CurrentUser() user: RequestUser, @Body() dto: UpdatePasswordDto) {
    return this.auth.updatePassword(user.id, dto);
  }
}
