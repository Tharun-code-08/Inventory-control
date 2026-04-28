import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { StockService } from '../stock/stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private readonly prisma;
    private readonly stock;
    constructor(prisma: PrismaService, stock: StockService);
    list(user: RequestUser, query: {
        shop_id?: string;
        category?: string;
        is_active?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            currentStock: number | undefined;
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
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(user: RequestUser, dto: CreateProductDto): Promise<{
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
    } & {
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
    }>;
    update(user: RequestUser, id: string, dto: UpdateProductDto): Promise<{
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
    }>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
    stockHistory(user: RequestUser, productId: string, query: {
        cursor?: string;
        take?: number;
    }): Promise<{
        data: {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            value: Prisma.Decimal | null;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            transactionRef: string;
            transactionDate: Date;
            inQty: Prisma.Decimal;
            outQty: Prisma.Decimal;
            balanceQty: Prisma.Decimal;
            unitRate: Prisma.Decimal | null;
            remarks: string | null;
            productId: string;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
}
