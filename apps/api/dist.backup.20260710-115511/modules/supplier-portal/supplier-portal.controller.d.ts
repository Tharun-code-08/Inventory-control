import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { VerifySupplierDto } from './dto/verify-supplier.dto';
import { SupplierPortalService } from './supplier-portal.service';
export declare class SupplierPortalController {
    private readonly portal;
    constructor(portal: SupplierPortalService);
    verify(dto: VerifySupplierDto): Promise<{
        supplier: {
            id: string;
            supplierName: string;
            email: string | null;
        };
        openRfqs: {
            id: string;
            rfqNumber: string;
            rfqDate: Date;
            deadline: Date | null;
            title: string;
        }[];
        selectedRfqId: string;
    }>;
    getRfq(id: string, supplierId: string): Promise<{
        shop: {
            shopName: string;
        };
        items: ({
            product: {
                description: string;
                productCode: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            description: string | null;
            uom: string;
            productId: string | null;
            rfqHeaderId: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            specifications: string | null;
        })[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        rfqNumber: string;
        rfqDate: Date;
        deadline: Date | null;
        title: string;
        notes: string | null;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
    }>;
    submitQuote(dto: SubmitPortalQuoteDto): Promise<{
        quoteNumber: string;
        referenceCode: string;
        totalValue: number;
        status: import(".prisma/client").$Enums.DocumentStatus;
    }>;
}
