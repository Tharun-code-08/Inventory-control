import type { Request } from 'express';
import type { RequestUser } from "../../../common/types/request-user";
import { RenameDeviceDto } from '../dto/link.dto';
import { LinkService } from './link.service';
export declare class LinkController {
    private readonly links;
    constructor(links: LinkService);
    generate(user: RequestUser, req: Request): Promise<{
        token: string;
        expiresAt: Date;
        instructions: string;
    }>;
    listDevices(user: RequestUser): Promise<{
        id: string;
        phoneNumber: string;
        nickname: string | null;
        deviceType: string | null;
        status: import(".prisma/client").$Enums.WhatsAppDeviceStatus;
        linkedAt: Date;
        lastSeenAt: Date | null;
    }[]>;
    renameDevice(user: RequestUser, id: string, dto: RenameDeviceDto): Promise<{
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
    revokeDevice(user: RequestUser, id: string): Promise<{
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
}
