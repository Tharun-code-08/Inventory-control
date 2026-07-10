import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { InviteAcceptDto } from './dto/invite-accept.dto';
export declare class InviteService {
    private readonly prisma;
    private readonly config;
    private readonly auth;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, auth: AuthService);
    private hashToken;
    private bcryptRounds;
    private turnstileSecret;
    private verifyTurnstile;
    private findValidInvite;
    preview(token: string): Promise<{
        email: string;
        name: string | null;
        roleName: import(".prisma/client").$Enums.RoleName;
        shopName: string | null;
        companyName: string | null;
        inviterName: string;
        expiresAt: string;
    }>;
    accept(dto: InviteAcceptDto, ctx: LoginContext): Promise<{
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
