import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AvatarStorageService } from '../../common/upload/avatar-storage.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
type SessionUserRecord = {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    shopId: string | null;
    passwordChangedAt?: Date | null;
    role: {
        name: string;
        permissions: unknown;
    };
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
type LoginUserRecord = SessionUserRecord & {
    passwordHash: string;
    isActive: boolean;
    failedLoginCount: number;
    lockedUntil: Date | null;
    mfaEnabled: boolean;
};
export type LoginContext = {
    ip?: string | null;
    userAgent?: string | null;
    deviceId?: string | null;
    requestId?: string;
};
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly avatarStorage;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, avatarStorage: AvatarStorageService, audit: AuditService);
    private bcryptRounds;
    private lockoutThreshold;
    private lockoutDurationMs;
    private lockoutUntilForFailures;
    private toSessionUser;
    private refreshTtl;
    private refreshTtlMs;
    private passwordVersion;
    private signAccessToken;
    private issueSession;
    validateCredentials(dto: LoginDto, ctx?: LoginContext): Promise<LoginUserRecord>;
    lockAccountForMfa(userId: string): Promise<Date>;
    login(dto: LoginDto, ctx?: LoginContext): Promise<{
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
    refreshFromToken(refreshToken: string | undefined, ctx?: LoginContext): Promise<{
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
    getSessionIdFromRefreshToken(refreshToken: string | undefined): Promise<string | null>;
    logout(userId: string, sessionId?: string | null): Promise<void>;
    listSessions(userId: string): Promise<{
        userAgent: string | null;
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        ip: string | null;
        lastSeenAt: Date;
    }[]>;
    revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{
        ok: boolean;
    }>;
    revokeAllForUser(userId: string): Promise<{
        revoked: number;
    }>;
    me(userId: string): Promise<{
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
    updateProfile(userId: string, dto: UpdateProfileDto, avatar?: Express.Multer.File): Promise<{
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
    updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{
        ok: boolean;
    }>;
    forceResetPassword(userId: string, nextPassword: string): Promise<{
        ok: boolean;
        passwordChangedAt: Date;
    }>;
    issueSessionForUser(userId: string, ctx?: LoginContext): Promise<{
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
export {};
