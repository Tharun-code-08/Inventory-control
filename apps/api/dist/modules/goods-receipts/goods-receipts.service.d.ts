import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
export declare class GoodsReceiptsService {
    private readonly prisma;
    private readonly stock;
    private readonly numbers;
    constructor(prisma: PrismaService, stock: StockService, numbers: DocumentNumberService);
    private assertNotFuture;
    list(user: RequestUser, query: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
        status?: DocumentStatus;
        cursor?: string;
        take?: number;
    }): Promise<{
        data: ({
            shop: {
                email: string;
                shopName: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                shopNumber: string;
                taxId: string | null;
                address: string;
                contactPerson: string;
                mobile: string;
                companyId: string | null;
            };
        } & {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.DocumentStatus;
            remarks: string | null;
            grDate: Date;
            purchaseOrderId: string | null;
            supplierName: string;
            supplierRef: string | null;
            grNumber: string;
            postedAt: Date | null;
            totalValue: Prisma.Decimal | null;
        })[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreateGoodsReceiptDto): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            purchaseRate: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        grDate: Date;
        purchaseOrderId: string | null;
        supplierName: string;
        supplierRef: string | null;
        grNumber: string;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
    }>;
    get(user: RequestUser, id: string): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            purchaseRate: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        grDate: Date;
        purchaseOrderId: string | null;
        supplierName: string;
        supplierRef: string | null;
        grNumber: string;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateGoodsReceiptDto): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            purchaseRate: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        grDate: Date;
        purchaseOrderId: string | null;
        supplierName: string;
        supplierRef: string | null;
        grNumber: string;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
    }>;
    post(user: RequestUser, id: string): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        items: ({
            product: {
                shopId: string;
                description: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productCode: string;
                uom: string;
                category: string;
                purchasePrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                minStockLevel: Prisma.Decimal;
                openingStock: Prisma.Decimal;
                reorderQty: Prisma.Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: Prisma.Decimal;
            purchaseRate: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        remarks: string | null;
        grDate: Date;
        purchaseOrderId: string | null;
        supplierName: string;
        supplierRef: string | null;
        grNumber: string;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
    }>;
    print(user: RequestUser, id: string): Promise<string>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
}
