import type { RequestUser } from '../../common/types/request-user';
import { WarehouseService } from './warehouse.service';
export declare class WarehouseController {
    private readonly warehouse;
    constructor(warehouse: WarehouseService);
    inventory(user: RequestUser, shopId?: string): Promise<{
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
