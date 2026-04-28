import { Queue } from 'bullmq';
import type { RequestUser } from '../../common/types/request-user';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
export declare class PurchaseOrdersController {
    private readonly service;
    private readonly exportsQueue;
    constructor(service: PurchaseOrdersService, exportsQueue: Queue);
    list(user: RequestUser, shopId?: string, cursor?: string, take?: string): Promise<{
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
            supplier: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.PurchaseOrderStatus;
            remarks: string | null;
            totalValue: import("@prisma/client/runtime/library").Decimal | null;
            poDate: Date;
            contractId: string | null;
            poNumber: string;
        })[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreatePurchaseOrderDto): Promise<{
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
            currentStock: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            orderQty: import("@prisma/client/runtime/library").Decimal;
            rate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            suggestedQty: import("@prisma/client/runtime/library").Decimal;
            poHeaderId: string;
        })[];
    } & {
        shopId: string;
        supplier: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        remarks: string | null;
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
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
            currentStock: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            orderQty: import("@prisma/client/runtime/library").Decimal;
            rate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            suggestedQty: import("@prisma/client/runtime/library").Decimal;
            poHeaderId: string;
        })[];
    } & {
        shopId: string;
        supplier: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        remarks: string | null;
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
    }>;
    update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto): Promise<{
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
            currentStock: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            orderQty: import("@prisma/client/runtime/library").Decimal;
            rate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            suggestedQty: import("@prisma/client/runtime/library").Decimal;
            poHeaderId: string;
        })[];
    } & {
        shopId: string;
        supplier: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        remarks: string | null;
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
    }>;
    confirm(user: RequestUser, id: string): Promise<{
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
            currentStock: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            orderQty: import("@prisma/client/runtime/library").Decimal;
            rate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            suggestedQty: import("@prisma/client/runtime/library").Decimal;
            poHeaderId: string;
        })[];
    } & {
        shopId: string;
        supplier: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        remarks: string | null;
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
    }>;
    cancel(user: RequestUser, id: string): Promise<{
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
            currentStock: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            orderQty: import("@prisma/client/runtime/library").Decimal;
            rate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            suggestedQty: import("@prisma/client/runtime/library").Decimal;
            poHeaderId: string;
        })[];
    } & {
        shopId: string;
        supplier: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        remarks: string | null;
        totalValue: import("@prisma/client/runtime/library").Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
    }>;
    exportPdf(user: RequestUser, id: string): Promise<{
        jobId: string | undefined;
    }>;
}
