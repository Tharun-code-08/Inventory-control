import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { StockService } from '../stock/stock.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { DocumentSeriesService } from '../document-series/document-series.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AuditService } from '../audit/audit.service';
import { BulkInventoryDto } from './dto/bulk-inventory.dto';
import { BulkProductUpsertDto } from './dto/bulk-product-upsert.dto';
import { ProductImageStorageService } from '../../common/upload/product-image-storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
type BulkUpsertRowStatus = 'created' | 'updated' | 'validated' | 'failed';
type BulkUpsertRowResult = {
    row: number;
    status: BulkUpsertRowStatus;
    action: 'create' | 'update';
    productCode: string;
    shopNumber: string;
    message: string;
    warnings: string[];
};
export declare class ProductsService {
    private readonly prisma;
    private readonly stock;
    private readonly subscriptions;
    private readonly numbers;
    private readonly series;
    private readonly images;
    private readonly audit;
    constructor(prisma: PrismaService, stock: StockService, subscriptions: SubscriptionService, numbers: DocumentNumberService, series: DocumentSeriesService, images: ProductImageStorageService, audit: AuditService);
    private validateAssignments;
    private plantBatchExpiryFields;
    private openingStockRemarks;
    private decoratePlant;
    private serializeProduct;
    private skuPrefixForCategory;
    private nextGeneratedProductCode;
    private resolveGeneratedProductCode;
    private buildStockBalanceMap;
    private getAccessibleShops;
    private resolveShopForImportRow;
    list(user: RequestUser, query: {
        shop_id?: string;
        category?: string;
        is_active?: boolean;
        search?: string;
        page?: number;
        limit?: number;
        company_catalog?: boolean;
    }): Promise<{
        data: {
            stockByShop: Record<string, number>;
            totalStock: number;
            currentStock: number;
            purchasePrice: number;
            sellingPrice: number;
            gstRate: number;
            plants: ({
                storageLocation: {
                    id: string;
                    name: string;
                    code: string;
                } | null;
            } & {
                shopId: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                productId: string;
                storageLocationId: string | null;
                openingStock: Prisma.Decimal;
                batchNumber: string | null;
                expiryDate: Date | null;
                minStockLevel: Prisma.Decimal;
                maxStockLevel: Prisma.Decimal | null;
                reorderQty: Prisma.Decimal | null;
            } & {
                openingStock: number;
                minStockLevel: number;
                maxStockLevel: number | null;
                reorderQty: number | null;
                batchNumber: string | null;
                expiryDate: string | null;
            })[];
            specifications: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                productId: string;
                label: string;
                value: string;
                sortOrder: number;
            }[];
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            description: string;
            productCode: string;
            uom: string;
            category: string;
            hsnCode: string | null;
            materialGroup: string | null;
            drawingReference: string | null;
            brand: string | null;
            taxPreference: import(".prisma/client").$Enums.TaxPreference;
            imageUrl: string | null;
            thumbnailUrl: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(user: RequestUser, dto: CreateProductDto): Promise<{
        purchasePrice: number;
        sellingPrice: number;
        gstRate: number;
        plants: ({
            storageLocation: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            storageLocationId: string | null;
            openingStock: Prisma.Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: Prisma.Decimal;
            maxStockLevel: Prisma.Decimal | null;
            reorderQty: Prisma.Decimal | null;
        } & {
            openingStock: number;
            minStockLevel: number;
            maxStockLevel: number | null;
            reorderQty: number | null;
            batchNumber: string | null;
            expiryDate: string | null;
        })[];
        specifications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            label: string;
            value: string;
            sortOrder: number;
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        description: string;
        productCode: string;
        uom: string;
        category: string;
        hsnCode: string | null;
        materialGroup: string | null;
        drawingReference: string | null;
        brand: string | null;
        taxPreference: import(".prisma/client").$Enums.TaxPreference;
        imageUrl: string | null;
        thumbnailUrl: string | null;
    }>;
    reorderSuggestion(user: RequestUser, id: string, shop_id?: string): Promise<{
        productId: string;
        shopId: string;
        productCode: string;
        description: string;
        supplier: string | null;
        rate: number;
        orderQty: number;
        currentStock: number;
        minStockLevel: Prisma.Decimal & number;
        suggestedQty: number;
        hasPriorOrder: boolean;
        lastPoNumber: string | null;
    }>;
    get(user: RequestUser, id: string): Promise<{
        stockByShop: Record<string, number>;
        totalStock: number;
        currentStock: number;
        purchasePrice: number;
        sellingPrice: number;
        gstRate: number;
        plants: ({
            storageLocation: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            storageLocationId: string | null;
            openingStock: Prisma.Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: Prisma.Decimal;
            maxStockLevel: Prisma.Decimal | null;
            reorderQty: Prisma.Decimal | null;
        } & {
            openingStock: number;
            minStockLevel: number;
            maxStockLevel: number | null;
            reorderQty: number | null;
            batchNumber: string | null;
            expiryDate: string | null;
        })[];
        specifications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            label: string;
            value: string;
            sortOrder: number;
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        description: string;
        productCode: string;
        uom: string;
        category: string;
        hsnCode: string | null;
        materialGroup: string | null;
        drawingReference: string | null;
        brand: string | null;
        taxPreference: import(".prisma/client").$Enums.TaxPreference;
        imageUrl: string | null;
        thumbnailUrl: string | null;
    }>;
    setImage(user: RequestUser, id: string, file: Express.Multer.File): Promise<{
        purchasePrice: number;
        sellingPrice: number;
        gstRate: number;
        plants: ({
            storageLocation: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            storageLocationId: string | null;
            openingStock: Prisma.Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: Prisma.Decimal;
            maxStockLevel: Prisma.Decimal | null;
            reorderQty: Prisma.Decimal | null;
        } & {
            openingStock: number;
            minStockLevel: number;
            maxStockLevel: number | null;
            reorderQty: number | null;
            batchNumber: string | null;
            expiryDate: string | null;
        })[];
        specifications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            label: string;
            value: string;
            sortOrder: number;
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        description: string;
        productCode: string;
        uom: string;
        category: string;
        hsnCode: string | null;
        materialGroup: string | null;
        drawingReference: string | null;
        brand: string | null;
        taxPreference: import(".prisma/client").$Enums.TaxPreference;
        imageUrl: string | null;
        thumbnailUrl: string | null;
    }>;
    removeImage(user: RequestUser, id: string): Promise<{
        purchasePrice: number;
        sellingPrice: number;
        gstRate: number;
        plants: ({
            storageLocation: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            storageLocationId: string | null;
            openingStock: Prisma.Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: Prisma.Decimal;
            maxStockLevel: Prisma.Decimal | null;
            reorderQty: Prisma.Decimal | null;
        } & {
            openingStock: number;
            minStockLevel: number;
            maxStockLevel: number | null;
            reorderQty: number | null;
            batchNumber: string | null;
            expiryDate: string | null;
        })[];
        specifications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            label: string;
            value: string;
            sortOrder: number;
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        description: string;
        productCode: string;
        uom: string;
        category: string;
        hsnCode: string | null;
        materialGroup: string | null;
        drawingReference: string | null;
        brand: string | null;
        taxPreference: import(".prisma/client").$Enums.TaxPreference;
        imageUrl: string | null;
        thumbnailUrl: string | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateProductDto): Promise<{
        purchasePrice: number;
        sellingPrice: number;
        gstRate: number;
        plants: ({
            storageLocation: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            storageLocationId: string | null;
            openingStock: Prisma.Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: Prisma.Decimal;
            maxStockLevel: Prisma.Decimal | null;
            reorderQty: Prisma.Decimal | null;
        } & {
            openingStock: number;
            minStockLevel: number;
            maxStockLevel: number | null;
            reorderQty: number | null;
            batchNumber: string | null;
            expiryDate: string | null;
        })[];
        specifications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            label: string;
            value: string;
            sortOrder: number;
        }[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        description: string;
        productCode: string;
        uom: string;
        category: string;
        hsnCode: string | null;
        materialGroup: string | null;
        drawingReference: string | null;
        brand: string | null;
        taxPreference: import(".prisma/client").$Enums.TaxPreference;
        imageUrl: string | null;
        thumbnailUrl: string | null;
    }>;
    deletionImpact(user: RequestUser, id: string): Promise<{
        canDelete: boolean;
        reason: string;
        suggestedAction: string | null;
        currentStock: number;
        historyCount: number;
        history: {
            goodsReceipts: number;
            goodsIssues: number;
            purchaseOrders: number;
            damaged: number;
            stockLedger: number;
        };
        plants: {
            shopId: string;
            shopNumber: string;
            shopName: string | null;
            isActive: boolean;
            currentStock: number;
        }[];
    }>;
    remove(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
    bulkUpdateInventory(user: RequestUser, dto: BulkInventoryDto): Promise<{
        updated: number;
        errors: {
            row: number;
            message: string;
        }[];
        total: number;
    }>;
    private applyBulkInventoryRow;
    bulkUpsert(user: RequestUser, dto: BulkProductUpsertDto): Promise<{
        validateOnly: boolean;
        total: number;
        created: number;
        updated: number;
        validated: number;
        failed: number;
        results: BulkUpsertRowResult[];
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    private applyBulkUpsertRow;
    private syncImportedStockLevel;
    stockHistory(user: RequestUser, productId: string, query: {
        cursor?: string;
        take?: number;
    }): Promise<{
        data: {
            shopId: string;
            idempotencyKey: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            productId: string;
            remarks: string | null;
            value: Prisma.Decimal | null;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            transactionRef: string;
            transactionDate: Date;
            inQty: Prisma.Decimal;
            outQty: Prisma.Decimal;
            balanceQty: Prisma.Decimal;
            unitRate: Prisma.Decimal | null;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
}
export {};
