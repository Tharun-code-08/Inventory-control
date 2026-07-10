import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import type { RequestUser } from '../../common/types/request-user';
import { ExportReportDto } from './dto/export-report.dto';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reports;
    private readonly exportsQueue;
    constructor(reports: ReportsService, exportsQueue: Queue);
    overview(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string): Promise<{
        range: {
            from: string;
            to: string;
        };
        stockValue: number;
        lowStockCount: number;
        poValue: number;
        poCount: number;
        salesValue: number;
        salesCount: number;
        grCount: number;
        salesOrderCount: number;
    }>;
    poSummary(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string, poNumber?: string, supplier?: string, status?: string, page?: string, limit?: string): Promise<{
        kpis: {
            totalCount: number;
            totalValue: number;
            confirmedCount: number;
            draftCount: number;
            cancelledCount: number;
        };
        rows: {
            id: string;
            poNumber: string;
            poDate: string;
            supplier: string;
            status: import(".prisma/client").$Enums.PurchaseOrderStatus;
            totalValue: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    salesSummary(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string, orderNumber?: string, customer?: string, status?: string, page?: string, limit?: string): Promise<{
        kpis: {
            totalCount: number;
            totalValue: number;
            confirmedCount: number;
            fulfilledCount: number;
            cancelledCount: number;
        };
        rows: {
            id: string;
            orderNumber: string;
            orderDate: string;
            customer: string;
            status: import(".prisma/client").$Enums.SalesOrderStatus;
            totalValue: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    inventory(user: RequestUser, shopId?: string, category?: string, low?: string): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        category: string;
        shop_id: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    lowStock(user: RequestUser, shopId?: string, category?: string): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        category: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    deadStock(user: RequestUser, shopId?: string, category?: string, supplier?: string, daysUnsold?: string, sortBy?: 'stockValue' | 'daysUnsold', page?: string, limit?: string): Promise<{
        summary: {
            totalDeadItems: number;
            totalDeadQty: number;
            totalDeadValue: number;
            theme: string;
        };
        items: {
            productId: string;
            productCode: string;
            name: string;
            category: string;
            supplier: string;
            currentStock: number;
            unitCost: number;
            stockValue: number;
            lastSaleDate: string | null;
            daysUnsold: number;
            severity: string;
            recommendation: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    reorderIntelligence(user: RequestUser, shopId: string, dateFrom?: string, dateTo?: string, category?: string, stockStatus?: 'IN_STOCK' | 'BELOW_MIN' | 'OVERSTOCK', sortBy?: 'urgency' | 'daysLeft' | 'avgSalesPerDay', page?: string, limit?: string): Promise<{
        summary: {
            totalProducts: number;
            urgent: {
                count: number;
                totalOrderQty: number;
            };
            warning: {
                count: number;
                totalOrderQty: number;
            };
            normal: {
                count: number;
                totalOrderQty: number;
            };
        };
        items: {
            productId: string;
            productCode: string;
            name: string;
            category: string;
            currentStock: number;
            minStockLevel: number;
            avgSalesPerDay: number;
            salesLast30Days: number;
            daysRemaining: number;
            suggestedOrderQty: number;
            leadTimeDays: number;
            lastRestockDate: string | null;
            urgency: "HIGH" | "LOW" | "MEDIUM";
            riskScore: number;
            calculation: {
                salesLast30Days: number;
                avgSalesPerDay: number;
                currentStock: number;
                daysRemaining: number;
                leadTimeDays: number;
                safetyStockDays: number;
                targetSupplyDays: number;
                suggestedOrderQty: number;
                reasoning: string;
            };
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    customerAging(user: RequestUser, shopId?: string, showOverdueOnly?: string, customerName?: string, sortBy?: 'totalOutstanding' | 'overdueAmount' | 'riskScore', page?: string, limit?: string): Promise<{
        summary: {
            totalCustomers: number;
            totalOutstanding: number;
            totalOverdue: number;
            overdueCustomers: number;
            avgCollectionDays: number;
        };
        items: {
            customerId: string;
            customerName: string;
            lastTransactionDate: string | null;
            agingBuckets: {
                current_0_30: number;
                watch_31_60: number;
                highRisk_61_90: number;
                critical_90plus: number;
            };
            totalOutstanding: number;
            overdueAmount: number;
            overdueInvoiceCount: number;
            collectionPercentage: number;
            avgPaymentDays: number;
            riskScore: "CRITICAL" | "HIGH" | "MEDIUM" | "GREEN";
            actions: string[];
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    productProfitability(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string, category?: string, showLossOnly?: string, sortBy?: 'profit' | 'margin' | 'revenue', page?: string, limit?: string): Promise<{
        summary: {
            totalRevenue: number;
            totalCogs: number;
            totalProfit: number;
            avgMargin: number;
            lossMakingProducts: number;
            unprofitableValue: number;
        };
        items: {
            productId: string;
            productCode: string;
            name: string;
            category: string;
            unitsSold: number;
            revenue: number;
            cogs: number;
            profit: number;
            marginPercentage: number;
            avgSellingPrice: number;
            avgCostPrice: number;
            profitRank: number;
            recommendation: "MONITOR" | "STOP_SELLING" | "REDUCE_DISCOUNT" | "PROMOTE";
        }[];
        pagination: {
            page: number;
            limit: number;
            totalCount: number;
        };
    }>;
    actionCenter(user: RequestUser, shopId?: string): Promise<{
        generatedAt: string;
        actionsSummary: {
            critical: number;
            high: number;
            medium: number;
        };
        actions: {
            id: string;
            priority: "CRITICAL" | "HIGH" | "MEDIUM";
            category: "cash-flow" | "procurement" | "inventory" | "pricing" | "opportunity";
            title: string;
            description: string;
            details: Record<string, any>;
            suggestedAction: string;
            estimatedImpact: string;
            reportSource: string;
        }[];
    }>;
    fastMoving(user: RequestUser, shopId: string, dateFrom: string, dateTo: string, limit?: string): Promise<{
        product_code: string;
        description: string;
        total_issued_qty: Prisma.Decimal;
        velocity: Prisma.Decimal;
        is_top_velocity_decile: boolean;
    }[]>;
    damaged(user: RequestUser, shopId?: string): Promise<({
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
        product: {
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
            gstRate: Prisma.Decimal;
            purchasePrice: Prisma.Decimal;
            sellingPrice: Prisma.Decimal;
            imageUrl: string | null;
            thumbnailUrl: string | null;
        };
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        productId: string;
        remarks: string | null;
        postedAt: Date | null;
        damageNumber: string;
        damageDate: Date;
        damagedQuantity: Prisma.Decimal;
        reason: string;
    })[]>;
    gr(user: RequestUser, dateFrom?: string, dateTo?: string, shopId?: string, grNumber?: string, status?: string, productId?: string, category?: string): Promise<({
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            uom: string;
            productId: string;
            storageLocationId: string | null;
            batchNumber: string | null;
            expiryDate: Date | null;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            grHeaderId: string;
            purchaseRate: Prisma.Decimal;
            serialNumber: string | null;
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
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal | null;
        grNumber: string;
        grDate: Date;
        purchaseOrderId: string | null;
        receiptType: import(".prisma/client").$Enums.ReceiptType;
        receiptSource: import(".prisma/client").$Enums.ReceiptSource;
        inwardShift: import(".prisma/client").$Enums.InwardShift | null;
        supplierRef: string | null;
    })[]>;
    gi(user: RequestUser, dateFrom?: string, dateTo?: string, shopId?: string): Promise<({
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            giHeaderId: string;
            availableStockSnapshot: Prisma.Decimal;
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
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        giNumber: string;
        giDate: Date;
        issueReason: string;
        issueType: string;
        otherReason: string | null;
    })[]>;
    ledger(user: RequestUser, productId?: string, dateFrom?: string, dateTo?: string, shopId?: string): Promise<{
        id: string;
        transaction_date: Date;
        transaction_type: import(".prisma/client").$Enums.TransactionType;
        product_code: string;
        description: string;
        in_qty: Prisma.Decimal;
        out_qty: Prisma.Decimal;
        balance_qty: Prisma.Decimal;
        reference_number: string;
    }[]>;
    shopSummary(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string): Promise<{
        shop_id: string;
        shop_name: string;
        sku_count: number;
        stock_value: number;
        low_stock_count: number;
        total_gr: number;
        total_gi: number;
        sales_value: number;
    }[]>;
    executiveSummary(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string): Promise<{
        range: {
            from: string;
            to: string;
        };
        kpis: {
            key: string;
            label: string;
            value: number;
            priorValue: number;
            changePct: number | null;
        }[];
        alerts: {
            severity: string;
            label: string;
            count: number;
            drillTab: string;
            drillFilters: {};
        }[];
        rankings: {
            topSuppliers: {
                label: string;
                value: number;
            }[];
            topCustomers: {
                label: string;
                value: number;
            }[];
        };
        systemHealth: {
            negativeStockCount: number;
            failedEmailCount: number;
            pendingOutboxCount: number;
            staleDraftCount: number;
        };
    }>;
    inventoryAging(user: RequestUser, shopId?: string, bucket?: string): Promise<{
        buckets: {
            bucket: string;
            itemCount: number;
            totalValue: number;
        }[];
        rows: {
            productCode: string;
            description: string;
            shopId: string;
            currentStock: number;
            lastMovementAt: string | null;
            ageDays: number;
            stockValue: number;
        }[];
    }>;
    rfqSummary(user: RequestUser, shopId?: string, dateFrom?: string, dateTo?: string): Promise<{
        createdCount: number;
        postedCount: number;
        awardedCount: number;
        conversionPct: number;
        avgCycleDays: number;
    }>;
    savedFilters(user: RequestUser, reportType?: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        name: string;
        reportType: string;
        filterJson: Prisma.JsonValue;
    }[]>;
    createSavedFilter(user: RequestUser, body: CreateSavedFilterDto): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        name: string;
        reportType: string;
        filterJson: Prisma.JsonValue;
    }>;
    deleteSavedFilter(user: RequestUser, id: string): Promise<Prisma.BatchPayload>;
    export(user: RequestUser, body: ExportReportDto): Promise<{
        jobId: string | undefined;
    }>;
}
