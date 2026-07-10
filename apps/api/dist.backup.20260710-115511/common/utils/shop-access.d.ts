import type { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/request-user';
export declare function verifyShopInTenant(prisma: PrismaService, user: RequestUser, shopId: string): Promise<void>;
export declare function repairOrphanShopsForUser(prisma: PrismaService, user: RequestUser): Promise<void>;
