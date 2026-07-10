import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { SubscriptionService } from '../billing/subscription.service';
import { StockService } from '../stock/stock.service';
export declare class ReportsService {
    private readonly prisma;
    private readonly subscriptions;
    private readonly stock;
    constructor(prisma: PrismaService, subscriptions: SubscriptionService, stock: StockService);
    private assertReportsAllowed;
    private resolveDateRange;
    private resolveShopIds;
    private shopWhere;
    inventory(user: RequestUser, filters: {
        shop_id?: string;
        category?: string;
        low_stock_only?: boolean;
    }): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        category: string;
        shop_id: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    lowStock(user: RequestUser, shop_id?: string, category?: string): Promise<{
        product_id: string;
        product_code: string;
        description: string;
        category: string;
        current_stock: Prisma.Decimal;
        min_stock_level: Prisma.Decimal;
    }[]>;
    analyticsOverview(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<{
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
    purchaseOrderSummary(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
        po_number?: string;
        supplier?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    salesOrderSummary(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
        order_number?: string;
        customer?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    listSavedFilters(user: RequestUser, reportType?: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        name: string;
        reportType: string;
        filterJson: Prisma.JsonValue;
    }[]>;
    createSavedFilter(user: RequestUser, payload: {
        reportType: string;
        name: string;
        filterJson: Prisma.InputJsonValue;
    }): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        name: string;
        reportType: string;
        filterJson: Prisma.JsonValue;
    }>;
    deleteSavedFilter(user: RequestUser, id: string): Promise<Prisma.BatchPayload>;
    private sumStockValue;
    private countLowStock;
    private computeChangePct;
    private periodSalesMetrics;
    private openPoValue;
    executiveSummary(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<{
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
    inventoryAging(user: RequestUser, filters: {
        shop_id?: string;
        bucket?: string;
    }): Promise<{
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
    rfqSummary(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<{
        createdCount: number;
        postedCount: number;
        awardedCount: number;
        conversionPct: number;
        avgCycleDays: number;
    }>;
    fastMoving(user: RequestUser, filters: {
        shop_id: string;
        date_from: string;
        date_to: string;
        limit?: number;
    }): Promise<{
        product_code: string;
        description: string;
        total_issued_qty: Prisma.Decimal;
        velocity: Prisma.Decimal;
        is_top_velocity_decile: boolean;
    }[]>;
    damagedRegister(user: RequestUser, shop_id?: string): Promise<({
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
    grRegister(user: RequestUser, filters: {
        date_from?: string;
        date_to?: string;
        shop_id?: string;
        gr_number?: string;
        status?: string;
        product_id?: string;
        category?: string;
    }): Promise<({
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
    giRegister(user: RequestUser, date_from?: string, date_to?: string, shop_id?: string): Promise<({
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
    stockLedger(user: RequestUser, product_id?: string, date_from?: string, date_to?: string, shop_id?: string): Promise<{
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
    shopSummary(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<{
        shop_id: string;
        shop_name: string;
        sku_count: number;
        stock_value: number;
        low_stock_count: number;
        total_gr: number;
        total_gi: number;
        sales_value: number;
    }[]>;
    deadStock(user: RequestUser, filters: {
        shop_id?: string;
        category?: string;
        supplier?: string;
        days_unsold: number;
        sort_by?: 'stockValue' | 'daysUnsold';
        page?: number;
        limit?: number;
    }): Promise<{
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
    reorderIntelligence(user: RequestUser, filters: {
        shop_id: string;
        date_from?: string;
        date_to?: string;
        category?: string;
        stock_status?: 'IN_STOCK' | 'BELOW_MIN' | 'OVERSTOCK';
        sort_by?: 'urgency' | 'daysLeft' | 'avgSalesPerDay';
        page?: number;
        limit?: number;
    }): Promise<{
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
    customerAging(user: RequestUser, filters: {
        shop_id?: string;
        show_overdue_only?: boolean;
        customer_name?: string;
        sort_by?: 'totalOutstanding' | 'overdueAmount' | 'riskScore';
        page?: number;
        limit?: number;
    }): Promise<{
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
    productProfitability(user: RequestUser, filters: {
        shop_id?: string;
        date_from?: string;
        date_to?: string;
        category?: string;
        show_loss_only?: boolean;
        sort_by?: 'profit' | 'margin' | 'revenue';
        page?: number;
        limit?: number;
    }): Promise<{
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
    actionCenter(user: RequestUser, filters: {
        shop_id?: string;
    }): Promise<{
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
}
