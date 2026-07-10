import type { RequestUser } from '../../common/types/request-user';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';
import { UpdateSupplierReturnDto } from './dto/update-supplier-return.dto';
import { UploadSupplierReturnImageDto } from './dto/upload-supplier-return-image.dto';
import { ReturnsService } from './returns.service';
export declare class ReturnsController {
    private readonly service;
    constructor(service: ReturnsService);
    listCustomer(user: RequestUser): Promise<({
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
        totalValue: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    })[]>;
    createCustomer(user: RequestUser, dto: CreateCustomerReturnDto): Promise<{
        items: {
            id: string;
            uom: string;
            productId: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    }>;
    postCustomer(user: RequestUser, id: string): Promise<{
        items: {
            id: string;
            uom: string;
            productId: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
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
        totalValue: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        customerId: string;
        salesOrderId: string | null;
        returnNumber: string;
        returnDate: Date;
    }>;
    listSupplier(user: RequestUser): Promise<({
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    getSupplier(user: RequestUser, id: string): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    createSupplier(user: RequestUser, dto: CreateSupplierReturnDto): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    updateSupplier(user: RequestUser, id: string, dto: UpdateSupplierReturnDto): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    uploadSupplierImage(user: RequestUser, id: string, dto: UploadSupplierReturnImageDto, file: Express.Multer.File): Promise<{
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
    deleteSupplierImage(user: RequestUser, id: string, imageId: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
    submitSupplier(user: RequestUser, id: string): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    sendSupplier(user: RequestUser, id: string, resend?: string): Promise<import("../document-email/document-email.types").DocumentEmailSendResult>;
    acknowledgeSupplier(user: RequestUser, id: string): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    cancelSupplier(user: RequestUser, id: string): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    postSupplier(user: RequestUser, id: string): Promise<{
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
                quantity: import("@prisma/client/runtime/library").Decimal;
                lineValue: import("@prisma/client/runtime/library").Decimal;
                grHeaderId: string;
                purchaseRate: import("@prisma/client/runtime/library").Decimal;
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
            quantity: import("@prisma/client/runtime/library").Decimal;
            lineValue: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            returnId: string;
            goodsReceiptItemId: string | null;
            grnQuantity: import("@prisma/client/runtime/library").Decimal | null;
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
        brandingSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        templateVersion: number;
        postedAt: Date | null;
        totalValue: import("@prisma/client/runtime/library").Decimal;
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
    getSupplierPublic(token: string): Promise<{
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
    acknowledgeSupplierPublic(token: string): Promise<{
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
}
