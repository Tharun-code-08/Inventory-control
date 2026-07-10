import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { VerifySupplierDto } from './dto/verify-supplier.dto';
import { SubscriptionService } from '../billing/subscription.service';
import { NotificationService } from '../notifications/services/notification.service';
export declare class SupplierPortalService {
    private readonly prisma;
    private readonly numbers;
    private readonly subscriptions;
    private readonly notifications;
    constructor(prisma: PrismaService, numbers: DocumentNumberService, subscriptions: SubscriptionService, notifications: NotificationService);
    private resolveSupplier;
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
    getRfqForSupplier(rfqId: string, supplierId: string): Promise<{
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
            quantity: Prisma.Decimal;
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
        brandingSnapshot: Prisma.JsonValue | null;
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
