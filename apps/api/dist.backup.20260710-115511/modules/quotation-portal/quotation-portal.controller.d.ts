import { RequestQuotationRevisionDto } from './dto/request-quotation-revision.dto';
import { QuotationPortalService } from './quotation-portal.service';
export declare class QuotationPortalController {
    private readonly portal;
    constructor(portal: QuotationPortalService);
    getQuote(token: string): Promise<{
        id: string;
        quoteNumber: string;
        quoteDate: Date;
        validUntil: Date | null;
        status: import(".prisma/client").$Enums.SalesQuotationStatus;
        remarks: string | null;
        totalValue: string;
        customerRequestedTotal: string | null;
        customerRequestNote: string | null;
        customer: {
            email: string | null;
            customerName: string;
        };
        shop: {
            shopNumber: string;
            shopName: string;
        };
        canRespond: boolean;
        items: {
            id: string;
            productCode: string;
            description: string;
            quantity: string;
            uom: string;
            unitPrice: string;
            lineValue: string;
        }[];
    }>;
    accept(token: string): Promise<{
        message: string;
        quotation: {
            id: string;
            quoteNumber: string;
            quoteDate: Date;
            validUntil: Date | null;
            status: import(".prisma/client").$Enums.SalesQuotationStatus;
            remarks: string | null;
            totalValue: string;
            customerRequestedTotal: string | null;
            customerRequestNote: string | null;
            customer: {
                email: string | null;
                customerName: string;
            };
            shop: {
                shopNumber: string;
                shopName: string;
            };
            canRespond: boolean;
            items: {
                id: string;
                productCode: string;
                description: string;
                quantity: string;
                uom: string;
                unitPrice: string;
                lineValue: string;
            }[];
        };
    }>;
    requestRevision(token: string, dto: RequestQuotationRevisionDto): Promise<{
        message: string;
        quotation: {
            id: string;
            quoteNumber: string;
            quoteDate: Date;
            validUntil: Date | null;
            status: import(".prisma/client").$Enums.SalesQuotationStatus;
            remarks: string | null;
            totalValue: string;
            customerRequestedTotal: string | null;
            customerRequestNote: string | null;
            customer: {
                email: string | null;
                customerName: string;
            };
            shop: {
                shopNumber: string;
                shopName: string;
            };
            canRespond: boolean;
            items: {
                id: string;
                productCode: string;
                description: string;
                quantity: string;
                uom: string;
                unitPrice: string;
                lineValue: string;
            }[];
        };
    }>;
}
