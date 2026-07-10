import { PrismaService } from '../../prisma/prisma.service';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { DocumentEmailService } from '../document-email/document-email.service';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentNumberService } from '../stock/document-number.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { RfqsService } from '../rfqs/rfqs.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
export declare class PurchaseOrdersService {
    private readonly prisma;
    private readonly numbers;
    private readonly audit;
    private readonly subscriptions;
    private readonly rfqs;
    private readonly emailNotifications;
    private readonly documentPdf;
    private readonly documentEmail;
    constructor(prisma: PrismaService, numbers: DocumentNumberService, audit: AuditService, subscriptions: SubscriptionService, rfqs: RfqsService, emailNotifications: EmailNotificationsService, documentPdf: DocumentPdfService, documentEmail: DocumentEmailService);
    private idempotencyScope;
    private createIdempotencyKey;
    private shopScopedServiceCode;
    private auditMeta;
    private getPoDownstreamLinks;
    private assertPoMutationAllowed;
    private resolvePoLineProduct;
    private buildPoLineCreates;
    private withLifecycle;
    private serialize;
    list(user: RequestUser, query: ListPurchaseOrdersDto): Promise<{
        data: {
            id: string;
            poNumber: string;
            poDate: string;
            shopId: string;
            rfqId: string | null;
            contractId: string | null | undefined;
            supplier: string;
            status: import(".prisma/client").$Enums.PurchaseOrderStatus;
            lifecycleStatus: string | undefined;
            remarks: string | null;
            currency: string | null | undefined;
            totalValue: number | null;
            createdAt: string;
            updatedAt: string;
            shop: {
                id: string;
                shopName: string | undefined;
                shopNumber: string | undefined;
            } | undefined;
            items: {
                id: string;
                productId: string;
                rfqItemId: string | null;
                lineDescription: string | null;
                lineCategory: string | null;
                currentStock: number;
                minStock: number;
                suggestedQty: number;
                orderQty: number;
                rate: number;
                lineValue: number;
                product: {
                    id: string;
                    productCode: string;
                    description: string;
                } | undefined;
            }[];
            receiptProgress: {
                productId: string;
                productCode: string | undefined;
                orderedQty: number;
                receivedQty: number;
                remainingQty: number;
            }[];
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            total: number;
            page: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreatePurchaseOrderDto): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    get(user: RequestUser, id: string): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    confirm(user: RequestUser, id: string, idempotencyKey?: string): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    cancel(user: RequestUser, id: string, idempotencyKey?: string): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    printHtml(user: RequestUser, id: string): Promise<string>;
    private formatMoney;
    private buildPoEmailContent;
    assertCancelAllowed(user: RequestUser, poId: string): Promise<{
        id: string;
        poNumber: string;
        poDate: string;
        shopId: string;
        rfqId: string | null;
        contractId: string | null | undefined;
        supplier: string;
        status: import(".prisma/client").$Enums.PurchaseOrderStatus;
        lifecycleStatus: string | undefined;
        remarks: string | null;
        currency: string | null | undefined;
        totalValue: number | null;
        createdAt: string;
        updatedAt: string;
        shop: {
            id: string;
            shopName: string | undefined;
            shopNumber: string | undefined;
        } | undefined;
        items: {
            id: string;
            productId: string;
            rfqItemId: string | null;
            lineDescription: string | null;
            lineCategory: string | null;
            currentStock: number;
            minStock: number;
            suggestedQty: number;
            orderQty: number;
            rate: number;
            lineValue: number;
            product: {
                id: string;
                productCode: string;
                description: string;
            } | undefined;
        }[];
        receiptProgress: {
            productId: string;
            productCode: string | undefined;
            orderedQty: number;
            receivedQty: number;
            remainingQty: number;
        }[];
    }>;
    sendToSupplierSafe(user: RequestUser, id: string, options?: {
        resend?: boolean;
    }): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
    sendToSupplier(user: RequestUser, id: string, options?: {
        resend?: boolean;
    }): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
}
