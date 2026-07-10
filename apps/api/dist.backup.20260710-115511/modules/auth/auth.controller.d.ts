import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RequestContextRequest } from '../../common/types/request-context';
import { LoginRateLimitGuard } from '../../common/guards/login-rate-limit.guard';
import type { RequestUser } from '../../common/types/request-user';
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
export declare class AuthController {
    private readonly auth;
    private readonly signup;
    private readonly invite;
    private readonly mfa;
    private readonly passwordReset;
    private readonly config;
    private readonly loginRateLimitGuard;
    constructor(auth: AuthService, signup: SignupService, invite: InviteService, mfa: MfaService, passwordReset: PasswordResetService, config: ConfigService, loginRateLimitGuard: LoginRateLimitGuard);
    private cookieName;
    private isProd;
    private resolvedSameSite;
    private refreshCookieOptions;
    private trustedMfaTtlMs;
    private trustedMfaCookieOptions;
    private csrfCookieOptions;
    private writeAuthCookies;
    private writeTrustedMfaCookie;
    private clearAuthCookies;
    private clearTrustedMfaCookie;
    private readCookie;
    private hasFunctionalCookieConsent;
    signupRequest(dto: SignupRequestDto): Promise<{
        expiresAt: string;
        phoneMasked?: string | undefined;
        ok: boolean;
        message: string;
        email: string;
        phoneOtpSent: boolean;
    }>;
    signupResend(dto: SignupResendDto): Promise<{
        expiresAt: string;
        phoneMasked?: string | undefined;
        ok: boolean;
        message: string;
        email: string;
        phoneOtpSent: boolean;
    }>;
    signupVerify(req: Request, dto: SignupVerifyDto): Promise<import("./signup.service").SignupVerifyResult>;
    signupCompletePaid(req: Request, dto: SignupCompletePaidDto): Promise<import("./signup.service").SignupMfaChallengeResult>;
    signupFinalize(req: Request, dto: SignupFinalizeDto, res: Response): Promise<{
        accessToken: string;
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
    invitePreview(query: InviteTokenDto): Promise<{
        email: string;
        name: string | null;
        roleName: import(".prisma/client").$Enums.RoleName;
        shopName: string | null;
        companyName: string | null;
        inviterName: string;
        expiresAt: string;
    }>;
    inviteAccept(req: Request, dto: InviteAcceptDto, res: Response): Promise<{
        accessToken: string;
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
    mfaEnrollStart(dto: MfaChallengeTokenDto): Promise<{
        email: string;
        manualCode: string;
        qrCodeDataUrl: string | null;
        otpAuthUrl: string;
        attemptsRemaining: number;
        expiresAt: string;
    }>;
    mfaEnrollRestart(req: Request, dto: MfaChallengeTokenDto): Promise<{
        mfaSetupRequired: true;
        challengeToken: string;
        email: string;
        expiresAt: string;
    }>;
    mfaEnrollVerify(req: Request, dto: MfaEnrollVerifyDto): Promise<{
        backupCodes: string[];
    }>;
    mfaLoginVerify(req: Request, dto: MfaLoginVerifyDto, res: Response): Promise<{
        accessToken: string;
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
    passwordResetRequest(req: Request, dto: RequestPasswordResetDto): Promise<{
        ok: boolean;
        method: "otp" | "magic_link";
        message: string;
    }>;
    passwordResetLinkPreview(query: PasswordResetLinkTokenDto): Promise<{
        email: string;
        expiresAt: string;
    }>;
    passwordResetLinkComplete(req: Request, dto: CompletePasswordResetLinkDto, res: Response): Promise<{
        accessToken: string;
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
    passwordResetOtpComplete(req: Request, dto: CompletePasswordResetOtpDto, res: Response): Promise<{
        accessToken: string;
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
    login(req: Request, dto: LoginDto, res: Response): Promise<{
        mfaRequired: true;
        challengeToken: string;
        email: string;
        availableMethods: readonly ["totp", "backup_code"];
        allowRememberDevice: true;
        attemptsRemaining: number;
        expiresAt: string;
    } | {
        accessToken: string;
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
    private loginCtx;
    private mobileAuthResponse;
    mobileLogin(req: RequestContextRequest, dto: LoginDto): Promise<{
        mfaRequired: true;
        challengeToken: string;
        email: string;
        availableMethods: readonly ["totp", "backup_code"];
        allowRememberDevice: true;
        attemptsRemaining: number;
        expiresAt: string;
    } | {
        accessToken: string;
        refreshToken: string;
        user: unknown;
    }>;
    mobileRefresh(req: Request, dto: MobileRefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: unknown;
    }>;
    mobileLogout(user: RequestUser, dto: MobileLogoutDto): Promise<{
        ok: boolean;
    }>;
    clearFunctionalCookies(res: Response): Promise<{
        ok: boolean;
    }>;
    refresh(req: any, res: Response): Promise<{
        accessToken: string;
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
    logout(user: RequestUser, req: any, res: Response): Promise<{
        ok: boolean;
    }>;
    me(user: RequestUser): Promise<{
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
    }>;
    mfaStatus(user: RequestUser): Promise<{
        enabled: boolean;
        method: string | null;
        enrolledAt: string | null;
    }>;
    mfaSettingsEnrollStart(user: RequestUser, req: Request): Promise<{
        email: string;
        manualCode: string;
        qrCodeDataUrl: string | null;
        otpAuthUrl: string;
        attemptsRemaining: number;
        expiresAt: string;
        challengeToken: string;
    }>;
    mfaSettingsEnrollVerify(user: RequestUser, req: Request, dto: MfaEnrollVerifyDto): Promise<{
        backupCodes: string[];
        enabled: true;
        method: "totp";
        enrolledAt: string;
    }>;
    mfaSettingsRegenerateBackupCodes(user: RequestUser, dto: MfaSettingsVerifyDto): Promise<{
        backupCodes: string[];
        regeneratedAt: string;
    }>;
    mfaSettingsDisable(user: RequestUser, dto: MfaSettingsVerifyDto, res: Response): Promise<{
        enabled: false;
        method: null;
        enrolledAt: null;
    }>;
    updateProfile(user: RequestUser, dto: UpdateProfileDto, avatar?: Express.Multer.File): Promise<{
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
    }>;
    updatePassword(user: RequestUser, dto: UpdatePasswordDto): Promise<{
        ok: boolean;
    }>;
    listSessions(user: RequestUser): Promise<{
        sessions: {
            userAgent: string | null;
            id: string;
            createdAt: Date;
            expiresAt: Date | null;
            ip: string | null;
            lastSeenAt: Date;
        }[];
    }>;
    revokeSession(user: RequestUser, sessionId: string): Promise<{
        ok: boolean;
    }>;
    adminRevokeAll(actor: RequestUser, userId: string): Promise<{
        revoked: number;
    }>;
}
