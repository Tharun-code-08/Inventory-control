import type { PrismaService } from '../../../prisma/prisma.service';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function loadGoodsReturnForPdf(prisma: PrismaService, id: string): Promise<{
    supplier: {
        deletedAt: Date | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        companyId: string | null;
        taxId: string | null;
        contactPerson: string | null;
        supplierCode: string;
        supplierName: string;
        vatNumber: string | null;
        rating: number;
        categories: string[];
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        paymentTerms: string | null;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
        iban: string | null;
    } | null;
    shop: {
        shopName: string;
    };
    items: ({
        product: {
            description: string;
            productCode: string;
        };
        goodsReceiptItem: ({
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
            storageLocationId: string | null;
            batchNumber: string | null;
            expiryDate: Date | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            grHeaderId: string;
            purchaseRate: import("@prisma/client/runtime/library").Decimal;
            serialNumber: string | null;
        }) | null;
    } & {
        id: string;
        uom: string;
        productId: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        lineValue: import("@prisma/client/runtime/library").Decimal;
        unitCost: import("@prisma/client/runtime/library").Decimal;
        returnId: string;
        goodsReceiptItemId: string | null;
        grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
        reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
    })[];
    goodsReceipt: {
        grNumber: string;
    } | null;
} & {
    shopId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    updatedById: string | null;
    status: import(".prisma/client").$Enums.ReturnStatus;
    supplierId: string | null;
    remarks: string | null;
    supplierName: string;
    brandingMode: import(".prisma/client").$Enums.BrandingMode;
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    postedAt: Date | null;
    totalValue: import("@prisma/client/runtime/library").Decimal;
    purchaseOrderId: string | null;
    supplierRef: string | null;
    reason: string | null;
    returnNumber: string;
    returnDate: Date;
    goodsReceiptId: string | null;
    internalCcEmail: string | null;
    submittedAt: Date | null;
    acknowledgedAt: Date | null;
    emailSentAt: Date | null;
    ackTokenHash: string | null;
    emailMessageId: string | null;
}>;
export declare function buildGoodsReturnPdfViewModel(prisma: PrismaService, ret: Awaited<ReturnType<typeof loadGoodsReturnForPdf>>): Promise<DocumentLayoutViewModel>;
export declare function goodsReturnPdfFilename(returnNumber: string): string;
export declare function renderGoodsReturnHtml(viewModel: DocumentLayoutViewModel): string;
