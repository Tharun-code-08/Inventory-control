import type { RequestUser } from '../../common/types/request-user';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly products;
    constructor(products: ProductsService);
    list(user: RequestUser, shopId?: string, legacyShopId?: string, category?: string, isActive?: string, legacyIsActive?: string, search?: string, page?: string, limit?: string): Promise<{
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
            purchasePrice: import("@prisma/client/runtime/library").Decimal;
            sellingPrice: import("@prisma/client/runtime/library").Decimal;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            openingStock: import("@prisma/client/runtime/library").Decimal;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
        purchasePrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        minStockLevel: import("@prisma/client/runtime/library").Decimal;
        openingStock: import("@prisma/client/runtime/library").Decimal;
        reorderQty: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    history(user: RequestUser, id: string, cursor?: string, take?: string): Promise<{
        data: {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            value: import("@prisma/client/runtime/library").Decimal | null;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            transactionRef: string;
            transactionDate: Date;
            inQty: import("@prisma/client/runtime/library").Decimal;
            outQty: import("@prisma/client/runtime/library").Decimal;
            balanceQty: import("@prisma/client/runtime/library").Decimal;
            unitRate: import("@prisma/client/runtime/library").Decimal | null;
            remarks: string | null;
            productId: string;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
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
        purchasePrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        minStockLevel: import("@prisma/client/runtime/library").Decimal;
        openingStock: import("@prisma/client/runtime/library").Decimal;
        reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
        purchasePrice: import("@prisma/client/runtime/library").Decimal;
        sellingPrice: import("@prisma/client/runtime/library").Decimal;
        minStockLevel: import("@prisma/client/runtime/library").Decimal;
        openingStock: import("@prisma/client/runtime/library").Decimal;
        reorderQty: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
}
