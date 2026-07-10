import { type UserChannelLink, type WhatsAppDevice } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from "../../../prisma/prisma.service";
import type { RequestUser } from "../../../common/types/request-user";
import { MailService } from "../../../common/mail/mail.service";
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/services/notification.service';
export declare const waAuthCacheKey: (phoneNumber: string) => string;
export type RedeemResult = {
    device: WhatsAppDevice;
    link: UserChannelLink;
};
export declare class LinkService {
    private readonly prisma;
    private readonly audit;
    private readonly mail;
    private readonly notifications;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, mail: MailService, notifications: NotificationService, redis: Redis);
    generateLinkToken(user: RequestUser, ip?: string | null, userAgent?: string | null): Promise<{
        token: string;
        expiresAt: Date;
        instructions: string;
    }>;
    redeemLinkToken(phoneNumber: string, rawToken: string): Promise<RedeemResult | null>;
    listDevices(user: RequestUser): Promise<{
        id: string;
        phoneNumber: string;
        nickname: string | null;
        deviceType: string | null;
        status: import(".prisma/client").$Enums.WhatsAppDeviceStatus;
        linkedAt: Date;
        lastSeenAt: Date | null;
    }[]>;
    renameDevice(user: RequestUser, deviceId: string, nickname: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import(".prisma/client").$Enums.WhatsAppDeviceStatus;
        revokedAt: Date | null;
        lastSeenAt: Date | null;
        phoneNumber: string;
        nickname: string | null;
        deviceType: string | null;
        linkedAt: Date;
        revokedById: string | null;
    }>;
    revokeDevice(user: RequestUser, deviceId: string): Promise<{
        revoked: boolean;
    }>;
    getStatus(user: RequestUser): Promise<{
        linked: false;
        status?: undefined;
        phoneNumber?: undefined;
        verifiedAt?: undefined;
        lastSeenAt?: undefined;
    } | {
        linked: boolean;
        status: import(".prisma/client").$Enums.ChannelLinkStatus;
        phoneNumber: string;
        verifiedAt: Date | null;
        lastSeenAt: Date | null;
    }>;
    unlink(user: RequestUser): Promise<{
        revoked: boolean;
    }>;
    touchLastSeen(link: UserChannelLink): Promise<void>;
    buildRequestUser(link: UserChannelLink): Promise<RequestUser | null>;
    expireStaleTokens(): Promise<number>;
    purgeOldTokens(): Promise<number>;
    private notifyDeviceLinked;
    private generateToken;
    canonicalizeToken(raw: string): string;
    private hashToken;
}
