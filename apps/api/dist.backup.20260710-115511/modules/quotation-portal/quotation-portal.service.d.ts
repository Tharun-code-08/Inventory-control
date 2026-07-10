import { PrismaService } from '../../prisma/prisma.service';
import { RequestQuotationRevisionDto } from './dto/request-quotation-revision.dto';
export declare class QuotationPortalService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private findByToken;
    private toPortalView;
    getByToken(portalToken: string): Promise<{
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
    accept(portalToken: string): Promise<{
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
    requestRevision(portalToken: string, dto: RequestQuotationRevisionDto): Promise<{
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
