import { ConfigService } from '@nestjs/config';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { CompletePasswordResetLinkDto } from './dto/complete-password-reset-link.dto';
import { CompletePasswordResetOtpDto } from './dto/complete-password-reset-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
export declare class PasswordResetService {
    private readonly prisma;
    private readonly config;
    private readonly mail;
    private readonly auth;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, mail: MailService, auth: AuthService);
    private normalizeEmail;
    private hashToken;
    private bcryptRounds;
    private resetTtlMs;
    private requestCooldownMs;
    private maxOtpAttempts;
    private generateOtp;
    private genericRequestResponse;
    private turnstileSecret;
    private verifyTurnstile;
    private applyPasswordReset;
    requestReset(dto: RequestPasswordResetDto, ctx?: LoginContext): Promise<{
        ok: boolean;
        method: "otp" | "magic_link";
        message: string;
    }>;
    previewMagicLink(token: string): Promise<{
        email: string;
        expiresAt: string;
    }>;
    completeMagicLink(dto: CompletePasswordResetLinkDto, ctx?: LoginContext): Promise<{
        accessToken: string;
        refreshCookieValue: string;
        sessionId: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            shopId: string | null;
            companyId: string | null;
            permissions: string[];
            isPlatformAdmin: boolean;
            avatarUrl: string | null;
            shop: {
                id: string;
                shopNumber: string;
                shopName: string;
                address: string;
                contactPerson: string;
                mobile: string;
                email: string;
                isActive: boolean;
                companyId: string | null;
            } | null;
        };
    }>;
    completeOtp(dto: CompletePasswordResetOtpDto, ctx?: LoginContext): Promise<{
        accessToken: string;
        refreshCookieValue: string;
        sessionId: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            shopId: string | null;
            companyId: string | null;
            permissions: string[];
            isPlatformAdmin: boolean;
            avatarUrl: string | null;
            shop: {
                id: string;
                shopNumber: string;
                shopName: string;
                address: string;
                contactPerson: string;
                mobile: string;
                email: string;
                isActive: boolean;
                companyId: string | null;
            } | null;
        };
    }>;
}
