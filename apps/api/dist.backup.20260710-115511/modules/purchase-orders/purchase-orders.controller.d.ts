import type { Response } from 'express';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PoCancelService } from './po-cancel.service';
import { RequestPoCancelDto, ConfirmPoCancelDto } from './dto/cancel-purchase-order.dto';
export declare class PurchaseOrdersController {
    private readonly service;
    private readonly poCancel;
    private readonly documentPdf;
    constructor(service: PurchaseOrdersService, poCancel: PoCancelService, documentPdf: DocumentPdfService);
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
    create(user: RequestUser, dto: CreatePurchaseOrderDto, idempotencyKey?: string): Promise<{
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
    } | {
        emailDelivery: import("../document-email/document-email.types").DocumentEmailSendResult;
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
    update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto, ifUnmodifiedSince?: string): Promise<{
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
    requestCancel(user: RequestUser, id: string, dto: RequestPoCancelDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    confirmCancel(user: RequestUser, id: string, dto: ConfirmPoCancelDto): Promise<{
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
    send(user: RequestUser, id: string, resend?: string): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
    exportPdf(user: RequestUser, id: string, res: Response): Promise<void>;
}
