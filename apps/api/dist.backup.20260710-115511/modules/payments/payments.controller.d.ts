import type { RequestUser } from '../../common/types/request-user';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    list(user: RequestUser, query: ListPaymentsDto): Promise<{
        data: {
            shopId: string;
            id: string;
            invoiceId: string;
            method: string | null;
            receiptNumber: string;
            receiptDate: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
            invoice: {
                id: string;
                invoiceNumber: string;
                totalValue: import("@prisma/client/runtime/library").Decimal;
                paidValue: import("@prisma/client/runtime/library").Decimal;
            };
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreatePaymentDto, idempotencyKey?: string): Promise<{
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
        invoice: {
            shopId: string;
            currency: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            invoiceNumber: string;
            remarks: string | null;
            brandingMode: import(".prisma/client").$Enums.BrandingMode;
            brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            templateVersion: number;
            totalValue: import("@prisma/client/runtime/library").Decimal;
            fxRateUsed: import("@prisma/client/runtime/library").Decimal | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            customerId: string;
            salesOrderId: string | null;
            invoiceDate: Date;
            paidValue: import("@prisma/client/runtime/library").Decimal;
            dueDate: Date | null;
        };
    } & {
        shopId: string;
        currency: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        invoiceId: string;
        method: string | null;
        remarks: string | null;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        fxRateUsed: import("@prisma/client/runtime/library").Decimal | null;
        receiptNumber: string;
        receiptDate: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
    }>;
    send(user: RequestUser, id: string, resend?: string): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
}
