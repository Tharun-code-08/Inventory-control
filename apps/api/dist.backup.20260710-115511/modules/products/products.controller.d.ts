import type { RequestUser } from '../../common/types/request-user';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { BulkInventoryDto } from './dto/bulk-inventory.dto';
import { BulkProductUpsertDto } from './dto/bulk-product-upsert.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchHsnDto } from './dto/search-hsn.dto';
import { GstHsnService } from './gst-hsn.service';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly products;
    private readonly gstHsn;
    constructor(products: ProductsService, gstHsn: GstHsnService);
    list(user: RequestUser, query: ListProductsDto): Promise<{
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
                openingStock: import("@prisma/client/runtime/library").Decimal;
                batchNumber: string | null;
                expiryDate: Date | null;
                minStockLevel: import("@prisma/client/runtime/library").Decimal;
                maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
                reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
            openingStock: import("@prisma/client/runtime/library").Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
    bulkInventory(user: RequestUser, dto: BulkInventoryDto): Promise<{
        updated: number;
        errors: {
            row: number;
            message: string;
        }[];
        total: number;
    }>;
    bulkUpsert(user: RequestUser, dto: BulkProductUpsertDto): Promise<{
        validateOnly: boolean;
        total: number;
        created: number;
        updated: number;
        validated: number;
        failed: number;
        results: {
            row: number;
            status: "failed" | "created" | "updated" | "validated";
            action: "create" | "update";
            productCode: string;
            shopNumber: string;
            message: string;
            warnings: string[];
        }[];
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    searchHsn(query: SearchHsnDto): Promise<import("./gst-hsn.service").GstHsnMatch[]>;
    history(user: RequestUser, id: string, page: CursorPageDto): Promise<{
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
            value: import("@prisma/client/runtime/library").Decimal | null;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            transactionRef: string;
            transactionDate: Date;
            inQty: import("@prisma/client/runtime/library").Decimal;
            outQty: import("@prisma/client/runtime/library").Decimal;
            balanceQty: import("@prisma/client/runtime/library").Decimal;
            unitRate: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
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
        minStockLevel: import("@prisma/client/runtime/library").Decimal & number;
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
            openingStock: import("@prisma/client/runtime/library").Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
            openingStock: import("@prisma/client/runtime/library").Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
    uploadImage(user: RequestUser, id: string, image: Express.Multer.File): Promise<{
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
            openingStock: import("@prisma/client/runtime/library").Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
            openingStock: import("@prisma/client/runtime/library").Decimal;
            batchNumber: string | null;
            expiryDate: Date | null;
            minStockLevel: import("@prisma/client/runtime/library").Decimal;
            maxStockLevel: import("@prisma/client/runtime/library").Decimal | null;
            reorderQty: import("@prisma/client/runtime/library").Decimal | null;
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
}
