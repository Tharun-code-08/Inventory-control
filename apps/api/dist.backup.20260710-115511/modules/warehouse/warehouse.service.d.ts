import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export declare class WarehouseService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    inventory(user: RequestUser, query: {
        shop_id?: string;
    }): Promise<{
        data: {
            key: string;
            productId: string;
            shopId: string;
            storageLocationId: string | null;
            expiryDate: string;
            batchNumber: string | null;
        }[];
    }>;
}
