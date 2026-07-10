import type { PrismaService } from '../../../prisma/prisma.service';
import { type GstSalesDocumentViewModel } from '../templates/gst-sales-document.template';
export declare function loadSalesOrderForPdf(prisma: PrismaService, id: string): Promise<{
    shop: {
        shopName: string;
    };
    customer: {
        shopId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        customerCode: string;
        customerName: string;
        pan: string | null;
    };
    items: ({
        product: {
            description: string;
            productCode: string;
            hsnCode: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        uom: string;
        productId: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        lineValue: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        soHeaderId: string;
        shippedQty: import("@prisma/client/runtime/library").Decimal;
        cgstRate: import("@prisma/client/runtime/library").Decimal;
        sgstRate: import("@prisma/client/runtime/library").Decimal;
        igstRate: import("@prisma/client/runtime/library").Decimal;
    })[];
    salesQuotation: {
        quoteNumber: string;
    } | null;
} & {
    shopId: string;
    currency: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    updatedById: string | null;
    status: import(".prisma/client").$Enums.SalesOrderStatus;
    remarks: string | null;
    brandingMode: import(".prisma/client").$Enums.BrandingMode;
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    totalValue: import("@prisma/client/runtime/library").Decimal | null;
    fxRateUsed: import("@prisma/client/runtime/library").Decimal | null;
    discountAmount: import("@prisma/client/runtime/library").Decimal;
    taxAmount: import("@prisma/client/runtime/library").Decimal;
    customerId: string;
    soNumber: string;
    orderDate: Date;
    expectedDate: Date | null;
    fulfillmentStatus: import(".prisma/client").$Enums.FulfillmentStatus;
    gstSupplyType: import(".prisma/client").$Enums.GstSupplyType;
    subtotalBeforeTax: import("@prisma/client/runtime/library").Decimal;
    totalCgst: import("@prisma/client/runtime/library").Decimal;
    totalSgst: import("@prisma/client/runtime/library").Decimal;
    totalIgst: import("@prisma/client/runtime/library").Decimal;
}>;
export declare function buildSalesOrderPdfViewModel(prisma: PrismaService, order: Awaited<ReturnType<typeof loadSalesOrderForPdf>>): Promise<GstSalesDocumentViewModel>;
export declare function salesOrderPdfFilename(soNumber: string): string;
export declare function renderSalesOrderHtml(viewModel: GstSalesDocumentViewModel): string;
