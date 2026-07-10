import type { PrismaService } from '../../../prisma/prisma.service';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function loadGoodsIssueForPdf(prisma: PrismaService, id: string): Promise<{
    shop: {
        address: string;
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
        quantity: import("@prisma/client/runtime/library").Decimal;
        giHeaderId: string;
        availableStockSnapshot: import("@prisma/client/runtime/library").Decimal;
    })[];
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
    brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    templateVersion: number;
    postedAt: Date | null;
    giNumber: string;
    giDate: Date;
    issueReason: string;
    issueType: string;
    otherReason: string | null;
}>;
export declare function buildGoodsIssuePdfViewModel(prisma: PrismaService, gi: Awaited<ReturnType<typeof loadGoodsIssueForPdf>>): Promise<DocumentLayoutViewModel>;
export declare function goodsIssuePdfFilename(giNumber: string): string;
export declare function renderGoodsIssueHtml(viewModel: DocumentLayoutViewModel): string;
