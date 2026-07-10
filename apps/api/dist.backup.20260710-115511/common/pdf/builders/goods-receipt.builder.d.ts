import type { PrismaService } from '../../../prisma/prisma.service';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function loadGoodsReceiptForPdf(prisma: PrismaService, id: string): Promise<{
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
    })[];
    purchaseOrder: {
        poNumber: string;
    } | null;
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
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    postedAt: Date | null;
    totalValue: import("@prisma/client/runtime/library").Decimal | null;
    grNumber: string;
    grDate: Date;
    purchaseOrderId: string | null;
    receiptType: import(".prisma/client").$Enums.ReceiptType;
    receiptSource: import(".prisma/client").$Enums.ReceiptSource;
    inwardShift: import(".prisma/client").$Enums.InwardShift | null;
    supplierRef: string | null;
}>;
export declare function buildGoodsReceiptPdfViewModel(prisma: PrismaService, gr: Awaited<ReturnType<typeof loadGoodsReceiptForPdf>>): Promise<DocumentLayoutViewModel>;
export declare function goodsReceiptPdfFilename(grNumber: string): string;
export declare function renderGoodsReceiptHtml(viewModel: DocumentLayoutViewModel): string;
