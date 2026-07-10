import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CostingService } from '../stock/costing.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';
import { UpdateSupplierReturnDto } from './dto/update-supplier-return.dto';
import { UploadSupplierReturnImageDto } from './dto/upload-supplier-return-image.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { DocumentEmailService } from '../document-email/document-email.service';
export declare class ReturnsService {
    private readonly prisma;
    private readonly stock;
    private readonly costing;
    private readonly numbers;
    private readonly audit;
    private readonly config;
    private readonly returnImages;
    private readonly emailNotifications;
    private readonly documentEmail;
    constructor(prisma: PrismaService, stock: StockService, costing: CostingService, numbers: DocumentNumberService, audit: AuditService, config: ConfigService, returnImages: ReturnImageStorageService, emailNotifications: EmailNotificationsService, documentEmail: DocumentEmailService);
    createCustomerReturn(user: RequestUser, dto: CreateCustomerReturnDto): Promise<{
        items: {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            returnId: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        invoiceId: string | null;
        remarks: string | null;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    }>;
    postCustomerReturn(user: RequestUser, id: string): Promise<{
        items: {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            returnId: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        invoiceId: string | null;
        remarks: string | null;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    }>;
    private findSupplierReturnRecord;
    private getSupplierReturnRecord;
    private resolveSupplierDraftData;
    createSupplierReturn(user: RequestUser, dto: CreateSupplierReturnDto): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    updateSupplierReturn(user: RequestUser, id: string, dto: UpdateSupplierReturnDto): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    uploadSupplierReturnImage(user: RequestUser, id: string, dto: UploadSupplierReturnImageDto, file: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        returnId: string;
        returnItemId: string | null;
        filePath: string;
        publicUrl: string;
        originalFilename: string;
        mimeType: string;
    }>;
    removeSupplierReturnImage(user: RequestUser, id: string, imageId: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
    private buildSupplierReturnEmailContent;
    submitSupplierReturn(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    sendSupplierReturnNotice(user: RequestUser, id: string, options?: {
        resend?: boolean;
    }): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
    cancelSupplierReturn(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    private postSupplierReturnStock;
    postSupplierReturn(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    manuallyAcknowledgeSupplierReturn(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    private findSupplierReturnByToken;
    private toSupplierReturnPortalView;
    getSupplierReturnPublic(token: string): Promise<{
        id: string;
        returnNumber: string;
        returnDate: Date;
        status: import(".prisma/client").$Enums.ReturnStatus;
        canAcknowledge: boolean;
        acknowledgedAt: Date | null;
        postedAt: Date | null;
        supplierName: string;
        grNumber: string;
        shopName: string;
        supplierRef: string | null;
        remarks: string | null;
        items: {
            id: string;
            productCode: string;
            description: string;
            grnQuantity: string;
            returnQuantity: string;
            reason: string;
            images: {
                id: string;
                url: string;
                filename: string;
            }[];
        }[];
    }>;
    acknowledgeSupplierReturn(token: string): Promise<{
        message: string;
        returnOrder: {
            id: string;
            returnNumber: string;
            returnDate: Date;
            status: import(".prisma/client").$Enums.ReturnStatus;
            canAcknowledge: boolean;
            acknowledgedAt: Date | null;
            postedAt: Date | null;
            supplierName: string;
            grNumber: string;
            shopName: string;
            supplierRef: string | null;
            remarks: string | null;
            items: {
                id: string;
                productCode: string;
                description: string;
                grnQuantity: string;
                returnQuantity: string;
                reason: string;
                images: {
                    id: string;
                    url: string;
                    filename: string;
                }[];
            }[];
        };
    }>;
    getSupplierReturn(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    }>;
    listCustomerReturns(user: RequestUser): Promise<({
        customer: {
            shopId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string | null;
            phone: string | null;
            taxId: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            customerCode: string;
            customerName: string;
            pan: string | null;
        };
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        invoiceId: string | null;
        remarks: string | null;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    })[]>;
    listSupplierReturns(user: RequestUser): Promise<({
        supplier: {
            id: string;
            email: string | null;
            supplierName: string;
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        shop: {
            company: {
                companyName: string;
            } | null;
            id: string;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
        };
        items: ({
            product: {
                id: string;
                description: string;
                productCode: string;
            };
            goodsReceiptItem: ({
                product: {
                    id: string;
                    description: string;
                    productCode: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                uom: string;
                productId: string;
                storageLocationId: string | null;
                batchNumber: string | null;
                expiryDate: Date | null;
                quantity: Prisma.Decimal;
                lineValue: Prisma.Decimal;
                grHeaderId: string;
                purchaseRate: Prisma.Decimal;
                serialNumber: string | null;
            }) | null;
            images: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                returnId: string;
                returnItemId: string | null;
                filePath: string;
                publicUrl: string;
                originalFilename: string;
                mimeType: string;
            }[];
        } & {
            id: string;
            uom: string;
            productId: string;
            quantity: Prisma.Decimal;
            lineValue: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: Prisma.Decimal | null;
            reasonCode: import(".prisma/client").$Enums.SupplierReturnReasonCode | null;
        })[];
        purchaseOrder: {
            supplier: string;
            id: string;
            poNumber: string;
        } | null;
        goodsReceipt: {
            id: string;
            supplierName: string;
            grNumber: string;
            grDate: Date;
            purchaseOrderId: string | null;
        } | null;
        images: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            returnId: string;
            returnItemId: string | null;
            filePath: string;
            publicUrl: string;
            originalFilename: string;
            mimeType: string;
        }[];
    } & {
        shopId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        status: import(".prisma/client").$Enums.ReturnStatus;
        supplierId: string | null;
        remarks: string | null;
        supplierName: string;
        brandingMode: import(".prisma/client").$Enums.BrandingMode;
        brandingSnapshot: Prisma.JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: Prisma.Decimal;
        purchaseOrderId: string | null;
        supplierRef: string | null;
        reason: string | null;
        returnNumber: string;
        returnDate: Date;
        goodsReceiptId: string | null;
        internalCcEmail: string | null;
        submittedAt: Date | null;
        acknowledgedAt: Date | null;
        emailSentAt: Date | null;
        ackTokenHash: string | null;
        emailMessageId: string | null;
    })[]>;
}
