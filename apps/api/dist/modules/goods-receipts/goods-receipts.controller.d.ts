import { DocumentStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';
export declare class GoodsReceiptsController {
    private readonly service;
    constructor(service: GoodsReceiptsService);
    list(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string, status?: DocumentStatus, cursor?: string, take?: string): Promise<{
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
            totalValue: import("@prisma/client/runtime/library").Decimal | null;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    print(user: RequestUser, id: string): Promise<string>;
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
                purchasePrice: import("@prisma/client/runtime/library").Decimal;
                sellingPrice: import("@prisma/client/runtime/library").Decimal;
                minStockLevel: import("@prisma/client/runtime/library").Decimal;
                openingStock: import("@prisma/client/runtime/library").Decimal;
                reorderQty: import("@prisma/client/runtime/library").Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
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
                purchasePrice: import("@prisma/client/runtime/library").Decimal;
                sellingPrice: import("@prisma/client/runtime/library").Decimal;
                minStockLevel: import("@prisma/client/runtime/library").Decimal;
                openingStock: import("@prisma/client/runtime/library").Decimal;
                reorderQty: import("@prisma/client/runtime/library").Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            uom: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
}
