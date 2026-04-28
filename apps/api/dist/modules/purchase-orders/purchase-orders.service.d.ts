import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
export declare class PurchaseOrdersService {
    private readonly prisma;
    private readonly numbers;
    constructor(prisma: PrismaService, numbers: DocumentNumberService);
    private assertNotFuture;
    list(user: RequestUser, query: {
        shop_id?: string;
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
            supplier: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.PurchaseOrderStatus;
            remarks: string | null;
            totalValue: Prisma.Decimal | null;
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
            currentStock: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            orderQty: Prisma.Decimal;
            rate: Prisma.Decimal;
            minStock: Prisma.Decimal;
            suggestedQty: Prisma.Decimal;
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
        totalValue: Prisma.Decimal | null;
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
            currentStock: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            orderQty: Prisma.Decimal;
            rate: Prisma.Decimal;
            minStock: Prisma.Decimal;
            suggestedQty: Prisma.Decimal;
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
        totalValue: Prisma.Decimal | null;
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
            currentStock: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            orderQty: Prisma.Decimal;
            rate: Prisma.Decimal;
            minStock: Prisma.Decimal;
            suggestedQty: Prisma.Decimal;
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
        totalValue: Prisma.Decimal | null;
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
            currentStock: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            orderQty: Prisma.Decimal;
            rate: Prisma.Decimal;
            minStock: Prisma.Decimal;
            suggestedQty: Prisma.Decimal;
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
        totalValue: Prisma.Decimal | null;
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
            currentStock: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            orderQty: Prisma.Decimal;
            rate: Prisma.Decimal;
            minStock: Prisma.Decimal;
            suggestedQty: Prisma.Decimal;
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
        totalValue: Prisma.Decimal | null;
        poDate: Date;
        contractId: string | null;
        poNumber: string;
    }>;
    printHtml(user: RequestUser, id: string): Promise<string>;
}
