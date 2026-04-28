import type { RequestUser } from '../../common/types/request-user';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    list(user: RequestUser): Promise<({
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        invoice: {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            remarks: string | null;
            totalValue: import("@prisma/client/runtime/library").Decimal;
            customerId: string;
            invoiceNumber: string;
            invoiceDate: Date;
            salesOrderId: string | null;
            dueDate: Date | null;
            paidValue: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        remarks: string | null;
        receiptNumber: string;
        receiptDate: Date;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        method: string | null;
        reference: string | null;
    })[]>;
    create(user: RequestUser, dto: CreatePaymentDto): Promise<{
        shop: {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        };
        invoice: {
            shopId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            remarks: string | null;
            totalValue: import("@prisma/client/runtime/library").Decimal;
            customerId: string;
            invoiceNumber: string;
            invoiceDate: Date;
            salesOrderId: string | null;
            dueDate: Date | null;
            paidValue: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        remarks: string | null;
        receiptNumber: string;
        receiptDate: Date;
        invoiceId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        method: string | null;
        reference: string | null;
    }>;
}
