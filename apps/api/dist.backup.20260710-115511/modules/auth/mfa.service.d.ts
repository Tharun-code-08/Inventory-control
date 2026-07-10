import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { MfaEnrollVerifyDto } from './dto/mfa-enroll-verify.dto';
import { MfaLoginVerifyDto } from './dto/mfa-login-verify.dto';
import { MfaSettingsVerifyDto } from './dto/mfa-settings-verify.dto';
export declare class MfaService {
    private readonly prisma;
    private readonly config;
    private readonly auth;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, auth: AuthService);
    private bcryptRounds;
    private challengeTtlMs;
    private loginMaxAttempts;
    private backupCodeCount;
    private trustedDeviceTtlMs;
    private signupSessionTtlMs;
    private attemptsRemaining;
    private hashToken;
    private encryptionKey;
    private encryptSecret;
    private decryptSecret;
    private normalizeBackupCode;
    private generateBackupCodes;
    private consumePreviousChallenges;
    private createChallenge;
    private findValidChallenge;
    private findValidSignupSession;
    private findActiveUser;
    private buildTotpSetup;
    private isValidTotp;
    private generateHashedBackupCodes;
    private failChallenge;
    private failSignupSession;
    verifyTrustedDevice(userId: string, rawToken: string | null | undefined, ctx?: LoginContext): Promise<boolean>;
    revokeTrustedDevices(userId: string, revokedAt?: Date): Promise<void>;
    getStatus(userId: string): Promise<{
        enabled: boolean;
        method: string | null;
        enrolledAt: string | null;
    }>;
    startAccountEnrollment(userId: string, ctx?: LoginContext): Promise<{
        email: string;
        manualCode: string;
        qrCodeDataUrl: string | null;
        otpAuthUrl: string;
        attemptsRemaining: number;
        expiresAt: string;
        challengeToken: string;
    }>;
    restartEnrollment(token: string, ctx?: LoginContext): Promise<{
        mfaSetupRequired: true;
        challengeToken: string;
        email: string;
        expiresAt: string;
    }>;
    createLoginChallenge(userId: string, email: string, ctx?: LoginContext): Promise<{
        mfaRequired: true;
        challengeToken: string;
        email: string;
        availableMethods: readonly ["totp", "backup_code"];
        allowRememberDevice: true;
        attemptsRemaining: number;
        expiresAt: string;
    }>;
    startEnrollment(token: string): Promise<{
        email: string;
        manualCode: string;
        qrCodeDataUrl: string | null;
        otpAuthUrl: string;
        attemptsRemaining: number;
        expiresAt: string;
    }>;
    verifyEnrollment(dto: MfaEnrollVerifyDto, ctx?: LoginContext): Promise<{
        backupCodes: string[];
    }>;
    verifyAccountEnrollment(userId: string, dto: MfaEnrollVerifyDto, ctx?: LoginContext): Promise<{
        backupCodes: string[];
        enabled: true;
        method: "totp";
        enrolledAt: string;
    }>;
    regenerateBackupCodes(userId: string, dto: MfaSettingsVerifyDto): Promise<{
        backupCodes: string[];
        regeneratedAt: string;
    }>;
    disableAccountMfa(userId: string, dto: MfaSettingsVerifyDto): Promise<{
        enabled: false;
        method: null;
        enrolledAt: null;
    }>;
    verifyLogin(dto: MfaLoginVerifyDto, ctx?: LoginContext): Promise<{
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
    } | {
        trustedDeviceToken: string;
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
