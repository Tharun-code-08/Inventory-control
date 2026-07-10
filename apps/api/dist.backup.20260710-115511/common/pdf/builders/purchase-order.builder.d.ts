import type { PrismaService } from '../../../prisma/prisma.service';
import { type PurchaseOrderPdfViewModel } from '../templates/purchase-order.template';
type PoForPdf = {
    poNumber: string;
    poDate: Date | string;
    supplier: string;
    shopId: string;
    remarks?: string | null;
    totalValue?: unknown;
    taxAmount?: unknown;
    shop?: {
        shopName?: string | null;
    } | null;
    items: Array<{
        productId: string;
        lineDescription?: string | null;
        lineCategory?: string | null;
        orderQty: unknown;
        rate: unknown;
        lineValue: unknown;
        product?: {
            productCode: string;
            description: string;
        } | null;
    }>;
};
export declare function buildPurchaseOrderPdfViewModel(prisma: PrismaService, po: PoForPdf, companyId: string): Promise<PurchaseOrderPdfViewModel>;
export declare function purchaseOrderPdfFilename(poNumber: string): string;
export declare function renderPurchaseOrderHtml(viewModel: PurchaseOrderPdfViewModel): string;
export declare function resolvePurchaseOrderCompanyId(prisma: PrismaService, shopId: string): Promise<string>;
export declare function loadPurchaseOrderForPdf(prisma: PrismaService, id: string): Promise<{
    shop: {
        shopName: string;
    };
    items: ({
        product: {
            description: string;
            productCode: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        productId: string;
        lineValue: import("@prisma/client/runtime/library").Decimal;
        rfqItemId: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        poHeaderId: string;
        lineDescription: string | null;
        lineCategory: string | null;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        suggestedQty: import("@prisma/client/runtime/library").Decimal;
        orderQty: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    })[];
} & {
    shopId: string;
    supplier: string;
    currency: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    updatedById: string | null;
    status: import(".prisma/client").$Enums.PurchaseOrderStatus;
    remarks: string | null;
    brandingMode: import(".prisma/client").$Enums.BrandingMode;
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    rfqId: string | null;
    contractId: string | null;
    totalValue: import("@prisma/client/runtime/library").Decimal | null;
    poNumber: string;
    poDate: Date;
    fxRateUsed: import("@prisma/client/runtime/library").Decimal | null;
    discountAmount: import("@prisma/client/runtime/library").Decimal;
    taxAmount: import("@prisma/client/runtime/library").Decimal;
}>;
export {};
