import type { PrismaService } from '../../../prisma/prisma.service';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function loadSalesQuotationForPdf(prisma: PrismaService, id: string): Promise<{
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
        quoteHeaderId: string;
    })[];
} & {
    shopId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    updatedById: string | null;
    status: import(".prisma/client").$Enums.SalesQuotationStatus;
    remarks: string | null;
    brandingMode: import(".prisma/client").$Enums.BrandingMode;
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    quoteNumber: string;
    quoteDate: Date;
    totalValue: import("@prisma/client/runtime/library").Decimal | null;
    validUntil: Date | null;
    customerId: string;
    salesOrderId: string | null;
    portalToken: string | null;
    customerRequestedTotal: import("@prisma/client/runtime/library").Decimal | null;
    customerRequestNote: string | null;
    customerRespondedAt: Date | null;
}>;
export declare function buildSalesQuotationPdfViewModel(prisma: PrismaService, quote: Awaited<ReturnType<typeof loadSalesQuotationForPdf>>): Promise<DocumentLayoutViewModel>;
export declare function salesQuotationPdfFilename(quoteNumber: string): string;
export declare function renderSalesQuotationHtml(viewModel: DocumentLayoutViewModel): string;
