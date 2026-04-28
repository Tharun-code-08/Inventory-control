import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
            totalValue: Prisma.Decimal;
            customerId: string;
            invoiceNumber: string;
            invoiceDate: Date;
            salesOrderId: string | null;
            dueDate: Date | null;
            paidValue: Prisma.Decimal;
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
        amount: Prisma.Decimal;
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
            totalValue: Prisma.Decimal;
            customerId: string;
            invoiceNumber: string;
            invoiceDate: Date;
            salesOrderId: string | null;
            dueDate: Date | null;
            paidValue: Prisma.Decimal;
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
        amount: Prisma.Decimal;
        method: string | null;
        reference: string | null;
    }>;
}
