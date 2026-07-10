import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierPaymentsDto } from './dto/list-supplier-payments.dto';
import { ReverseSupplierPaymentDto } from './dto/reverse-supplier-payment.dto';
import { SupplierPaymentsService } from './supplier-payments.service';
export declare class SupplierPaymentsController {
    private readonly supplierPayments;
    constructor(supplierPayments: SupplierPaymentsService);
    list(user: RequestUser, query: ListSupplierPaymentsDto): Promise<{
        data: {
            shopId: string;
            id: string;
            method: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
            paymentNumber: string;
            paymentDate: Date;
            supplierBillId: string;
            supplierBill: {
                id: string;
                totalValue: import("@prisma/client/runtime/library").Decimal;
                paidValue: import("@prisma/client/runtime/library").Decimal;
                billNumber: string;
            };
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreateSupplierPaymentDto, idempotencyKey?: string): Promise<{
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
        supplierBill: {
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
        };
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        method: string | null;
        remarks: string | null;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string | null;
        paymentNumber: string;
        paymentDate: Date;
        supplierBillId: string;
    }>;
    reverse(user: RequestUser, id: string, dto: ReverseSupplierPaymentDto): Promise<{
        ok: boolean;
        reversedPaymentId: string;
        supplierBillId: string;
        paidValue: string;
        status: "ISSUED" | "PARTIALLY_PAID" | "PAID";
    }>;
    send(user: RequestUser, id: string, resend?: string): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
}
