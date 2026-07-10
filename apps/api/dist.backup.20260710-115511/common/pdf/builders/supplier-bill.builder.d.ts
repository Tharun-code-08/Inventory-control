import type { PrismaService } from '../../../prisma/prisma.service';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function loadSupplierBillForPdf(prisma: PrismaService, id: string): Promise<{
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
    };
    items: ({
        product: {
            description: string;
            productCode: string;
        };
    } & {
        id: string;
        uom: string;
        productId: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        lineValue: import("@prisma/client/runtime/library").Decimal;
        unitCost: import("@prisma/client/runtime/library").Decimal;
        billHeaderId: string;
    })[];
    purchaseOrder: {
        poNumber: string;
    } | null;
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
    status: import(".prisma/client").$Enums.SupplierBillStatus;
    supplierId: string;
    remarks: string | null;
    brandingMode: import(".prisma/client").$Enums.BrandingMode;
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    totalValue: import("@prisma/client/runtime/library").Decimal;
    purchaseOrderId: string | null;
    paidValue: import("@prisma/client/runtime/library").Decimal;
    dueDate: Date | null;
    goodsReceiptId: string | null;
    billNumber: string;
    billDate: Date;
}>;
export declare function buildSupplierBillPdfViewModel(prisma: PrismaService, bill: Awaited<ReturnType<typeof loadSupplierBillForPdf>>): Promise<DocumentLayoutViewModel>;
export declare function supplierBillPdfFilename(billNumber: string): string;
export declare function renderSupplierBillHtml(viewModel: DocumentLayoutViewModel): string;
