import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { PurchaseOrdersService } from './purchase-orders.service';
export declare class PoCancelService {
    private readonly prisma;
    private readonly mail;
    private readonly purchaseOrders;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService, purchaseOrders: PurchaseOrdersService);
    private hashOtp;
    private generateOtp;
    requestCancel(user: RequestUser, poId: string, reason: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    confirmCancel(user: RequestUser, poId: string, reason: string, otp: string): Promise<{
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
}
