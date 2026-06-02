import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Placeholder for FIFO lot consumption. Lot-level inventory is optional;
 * stock movements still post through StockService when this is a no-op.
 */
@Injectable()
export class InventoryLotService {
  async consumeFifo(
    _tx: Prisma.TransactionClient,
    _shopId: string,
    _productId: string,
    _quantity: Prisma.Decimal,
  ): Promise<void> {
    void _tx;
    void _shopId;
    void _productId;
    void _quantity;
    // No-op until lot tracking tables are enabled.
  }
}
