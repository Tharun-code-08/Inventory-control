import { Prisma } from '@prisma/client';
export declare class InventoryLotService {
    consumeFifo(_tx: Prisma.TransactionClient, _shopId: string, _productId: string, _quantity: Prisma.Decimal): Promise<void>;
}
