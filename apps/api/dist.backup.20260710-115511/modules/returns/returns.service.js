"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const portal_url_1 = require("../../common/mail/portal-url");
const return_image_storage_service_1 = require("../../common/upload/return-image-storage.service");
const date_guards_1 = require("../../common/utils/date-guards");
const money_1 = require("../../common/utils/money");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const shop_scope_1 = require("../../common/utils/shop-scope");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const costing_service_1 = require("../stock/costing.service");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const document_email_service_1 = require("../document-email/document-email.service");
const supplierReturnInclude = client_1.Prisma.validator()({
    shop: {
        select: {
            id: true,
            shopName: true,
            shopNumber: true,
            email: true,
            companyId: true,
            company: { select: { companyName: true } },
        },
    },
    supplier: {
        select: {
            id: true,
            supplierName: true,
            email: true,
            city: true,
            state: true,
            country: true,
        },
    },
    purchaseOrder: {
        select: {
            id: true,
            poNumber: true,
            supplier: true,
        },
    },
    goodsReceipt: {
        select: {
            id: true,
            grNumber: true,
            grDate: true,
            supplierName: true,
            purchaseOrderId: true,
        },
    },
    images: true,
    items: {
        include: {
            product: {
                select: {
                    id: true,
                    productCode: true,
                    description: true,
                },
            },
            goodsReceiptItem: {
                include: {
                    product: {
                        select: {
                            id: true,
                            productCode: true,
                            description: true,
                        },
                    },
                },
            },
            images: true,
        },
    },
});
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function reasonLabel(reason) {
    switch (reason) {
        case client_1.SupplierReturnReasonCode.DAMAGED:
            return 'Damaged';
        case client_1.SupplierReturnReasonCode.WRONG_ITEM:
            return 'Wrong item';
        case client_1.SupplierReturnReasonCode.EXPIRED:
            return 'Expired';
        case client_1.SupplierReturnReasonCode.EXCESS:
            return 'Excess';
        default:
            return 'Other';
    }
}
let ReturnsService = class ReturnsService {
    prisma;
    stock;
    costing;
    numbers;
    audit;
    config;
    returnImages;
    emailNotifications;
    documentEmail;
    constructor(prisma, stock, costing, numbers, audit, config, returnImages, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.stock = stock;
        this.costing = costing;
        this.numbers = numbers;
        this.audit = audit;
        this.config = config;
        this.returnImages = returnImages;
        this.emailNotifications = emailNotifications;
        this.documentEmail = documentEmail;
    }
    async createCustomerReturn(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
        (0, date_guards_1.assertNotFuture)(returnDate);
        let total = new client_1.Prisma.Decimal(0);
        const items = dto.items.map((it) => {
            const quantity = (0, money_1.asMoney)(it.quantity);
            const unitPrice = (0, money_1.asMoney)(it.unitPrice);
            const lineValue = (0, money_1.roundMoney)(quantity.mul(unitPrice));
            total = total.add(lineValue);
            return {
                productId: it.productId,
                quantity,
                uom: it.uom ?? 'UNIT',
                unitPrice: (0, money_1.roundMoney)(unitPrice),
                lineValue,
            };
        });
        return this.prisma.$transaction(async (tx) => {
            const number = await this.numbers.nextConfiguredNumber(tx, {
                shopId,
                docType: 'CRT',
                date: returnDate,
            });
            const created = await tx.customerReturn.create({
                data: {
                    returnNumber: number,
                    returnDate,
                    shopId,
                    customerId: dto.customerId,
                    invoiceId: dto.invoiceId ?? null,
                    salesOrderId: dto.salesOrderId ?? null,
                    reason: dto.reason ?? null,
                    remarks: dto.remarks ?? null,
                    status: client_1.ReturnStatus.DRAFT,
                    totalValue: (0, money_1.roundMoney)(total),
                    createdById: user.id,
                    items: { create: items },
                },
                include: { items: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'CUSTOMER_RETURN',
                entityId: created.id,
                newValues: {
                    returnNumber: created.returnNumber,
                    customerId: created.customerId,
                    totalValue: created.totalValue.toString(),
                },
            }, tx);
            return created;
        });
    }
    async postCustomerReturn(user, id) {
        const ret = await this.prisma.customerReturn.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!ret)
            throw new common_1.NotFoundException('Customer return not found');
        (0, shop_scope_1.assertShopScope)(user, ret.shopId);
        if (ret.status === client_1.ReturnStatus.POSTED)
            return ret;
        if (ret.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException(`Cannot post return in status ${ret.status}`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: ret.shopId },
            select: { costingMethod: true },
        });
        const method = shop?.costingMethod ?? client_1.CostingMethod.AVERAGE;
        return this.prisma.$transaction(async (tx) => {
            const transitioned = await tx.customerReturn.updateMany({
                where: { id, status: client_1.ReturnStatus.DRAFT },
                data: {
                    status: client_1.ReturnStatus.POSTED,
                    postedAt: new Date(),
                    updatedById: user.id,
                },
            });
            if (transitioned.count === 0) {
                throw new common_1.ConflictException('Customer return state changed concurrently');
            }
            for (const line of ret.items) {
                await this.stock.postMovementOnce(tx, {
                    type: client_1.TransactionType.GOODS_RECEIPT,
                    ref: ret.returnNumber,
                    date: ret.returnDate,
                    shopId: ret.shopId,
                    productId: line.productId,
                    inQty: Number(line.quantity),
                    outQty: 0,
                    unitRate: Number(line.unitPrice),
                    remarks: 'Customer return',
                    sourceType: 'CUSTOMER_RETURN',
                    sourceId: ret.id,
                    sourceLineId: line.id,
                    idempotencyKey: `cust-ret:${ret.id}:${line.id}`,
                    userId: user.id,
                });
                await this.costing.recordInflow(tx, {
                    shopId: ret.shopId,
                    productId: line.productId,
                    qty: new client_1.Prisma.Decimal(line.quantity),
                    unitCost: new client_1.Prisma.Decimal(line.unitPrice),
                    method,
                });
            }
            const creditNumber = await this.numbers.nextNumber(tx, {
                shopId: ret.shopId,
                docType: 'CN',
                prefix: 'CN',
                date: ret.returnDate,
            });
            await tx.creditNote.create({
                data: {
                    creditNumber,
                    creditDate: ret.returnDate,
                    shopId: ret.shopId,
                    customerId: ret.customerId,
                    invoiceId: ret.invoiceId,
                    returnId: ret.id,
                    status: client_1.CreditNoteStatus.ISSUED,
                    amount: ret.totalValue,
                    createdById: user.id,
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'CUSTOMER_RETURN',
                entityId: ret.id,
                newValues: { status: client_1.ReturnStatus.POSTED, creditNumber },
            }, tx);
            return tx.customerReturn.findUniqueOrThrow({
                where: { id },
                include: { items: true, creditNote: true },
            });
        });
    }
    async findSupplierReturnRecord(id) {
        const ret = await this.prisma.supplierReturn.findUnique({
            where: { id },
            include: supplierReturnInclude,
        });
        if (!ret)
            throw new common_1.NotFoundException('Supplier return not found');
        return ret;
    }
    async getSupplierReturnRecord(user, id) {
        const ret = await this.findSupplierReturnRecord(id);
        (0, shop_scope_1.assertShopScope)(user, ret.shopId);
        return ret;
    }
    async resolveSupplierDraftData(tx, user, dto, currentReturnId) {
        const goodsReceipt = await tx.goodsReceiptHeader.findUnique({
            where: { id: dto.goodsReceiptId },
            include: {
                shop: {
                    select: {
                        id: true,
                        companyId: true,
                        shopName: true,
                        company: { select: { companyName: true } },
                    },
                },
                purchaseOrder: {
                    select: {
                        id: true,
                        supplier: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productCode: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });
        if (!goodsReceipt)
            throw new common_1.NotFoundException('Goods receipt not found');
        (0, shop_scope_1.assertShopScope)(user, goodsReceipt.shopId);
        if (goodsReceipt.status !== client_1.DocumentStatus.POSTED) {
            throw new common_1.BadRequestException('Only posted goods receipts can be returned');
        }
        if (dto.shopId && dto.shopId !== goodsReceipt.shopId) {
            throw new common_1.BadRequestException('shopId must match the selected goods receipt');
        }
        const supplierName = goodsReceipt.supplierName.trim();
        const expectedSupplier = goodsReceipt.purchaseOrder?.supplier?.trim();
        if (expectedSupplier &&
            expectedSupplier.localeCompare(supplierName, undefined, { sensitivity: 'accent' }) !== 0) {
            throw new common_1.BadRequestException('Supplier master does not match the goods receipt source');
        }
        const supplier = goodsReceipt.shop.companyId
            ? await tx.supplier.findFirst({
                where: {
                    companyId: goodsReceipt.shop.companyId,
                    deletedAt: null,
                    supplierName: { equals: supplierName, mode: 'insensitive' },
                },
                select: {
                    id: true,
                    supplierName: true,
                    email: true,
                },
            })
            : null;
        if (!supplier) {
            throw new common_1.BadRequestException(`Supplier "${supplierName}" must exist in supplier master for return notices.`);
        }
        const lineIds = dto.items.map((item) => item.goodsReceiptItemId);
        const uniqueLineIds = new Set(lineIds);
        if (uniqueLineIds.size !== lineIds.length) {
            throw new common_1.BadRequestException('Each goods receipt line can be selected only once per return');
        }
        const goodsReceiptItemMap = new Map(goodsReceipt.items.map((item) => [item.id, item]));
        const reservedByGrItem = new Map();
        const existingLines = await tx.supplierReturnItem.findMany({
            where: {
                goodsReceiptItemId: { in: lineIds },
                header: {
                    status: {
                        in: [
                            client_1.ReturnStatus.DRAFT,
                            client_1.ReturnStatus.SUBMITTED,
                            client_1.ReturnStatus.ACKNOWLEDGED,
                            client_1.ReturnStatus.DONE,
                            client_1.ReturnStatus.POSTED,
                        ],
                    },
                    ...(currentReturnId ? { id: { not: currentReturnId } } : {}),
                },
            },
            select: {
                goodsReceiptItemId: true,
                quantity: true,
            },
        });
        for (const line of existingLines) {
            if (!line.goodsReceiptItemId)
                continue;
            const current = reservedByGrItem.get(line.goodsReceiptItemId) ?? new client_1.Prisma.Decimal(0);
            reservedByGrItem.set(line.goodsReceiptItemId, current.add(line.quantity));
        }
        let total = new client_1.Prisma.Decimal(0);
        const items = dto.items.map((item) => {
            const grItem = goodsReceiptItemMap.get(item.goodsReceiptItemId);
            if (!grItem) {
                throw new common_1.BadRequestException('All return items must belong to the selected goods receipt');
            }
            const returnQty = (0, money_1.asMoney)(item.returnQty);
            const alreadyReserved = reservedByGrItem.get(grItem.id) ?? new client_1.Prisma.Decimal(0);
            const availableQty = new client_1.Prisma.Decimal(grItem.quantity).sub(alreadyReserved);
            if (returnQty.gt(availableQty)) {
                throw new common_1.BadRequestException(`Return quantity exceeds available quantity for ${grItem.product.productCode}. Available: ${availableQty.toString()}`);
            }
            const unitCost = new client_1.Prisma.Decimal(grItem.purchaseRate);
            const lineValue = (0, money_1.roundMoney)(returnQty.mul(unitCost));
            total = total.add(lineValue);
            return {
                goodsReceiptItemId: grItem.id,
                productId: grItem.productId,
                quantity: returnQty,
                grnQuantity: new client_1.Prisma.Decimal(grItem.quantity),
                uom: grItem.uom,
                unitCost: (0, money_1.roundMoney)(unitCost),
                lineValue,
                reasonCode: item.reasonCode,
            };
        });
        return {
            goodsReceipt,
            supplier,
            supplierName,
            total: (0, money_1.roundMoney)(total),
            items,
        };
    }
    async createSupplierReturn(user, dto) {
        const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
        (0, date_guards_1.assertNotFuture)(returnDate);
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const draft = await this.resolveSupplierDraftData(tx, user, dto);
            const number = await this.numbers.nextConfiguredNumber(tx, {
                shopId: draft.goodsReceipt.shopId,
                docType: 'SRT',
                date: returnDate,
            });
            const created = await tx.supplierReturn.create({
                data: {
                    returnNumber: number,
                    returnDate,
                    shopId: draft.goodsReceipt.shopId,
                    supplierName: draft.supplierName,
                    supplierId: draft.supplier.id,
                    purchaseOrderId: draft.goodsReceipt.purchaseOrderId ?? null,
                    goodsReceiptId: draft.goodsReceipt.id,
                    supplierRef: dto.supplierRef?.trim() || null,
                    remarks: dto.remarks?.trim() || null,
                    internalCcEmail: dto.internalCcEmail?.trim() || null,
                    status: client_1.ReturnStatus.DRAFT,
                    totalValue: draft.total,
                    createdById: user.id,
                    items: { create: draft.items },
                },
                include: supplierReturnInclude,
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'SUPPLIER_RETURN',
                entityId: created.id,
                newValues: {
                    returnNumber: created.returnNumber,
                    goodsReceiptId: created.goodsReceiptId,
                    supplierId: created.supplierId,
                    totalValue: created.totalValue.toString(),
                },
            }, tx);
            return created;
        });
    }
    async updateSupplierReturn(user, id, dto) {
        const existing = await this.getSupplierReturnRecord(user, id);
        if (existing.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft supplier returns can be edited');
        }
        const resolvedItems = dto.items ??
            existing.items.map((item) => ({
                goodsReceiptItemId: item.goodsReceiptItemId ?? '',
                returnQty: Number(item.quantity),
                reasonCode: item.reasonCode ?? client_1.SupplierReturnReasonCode.DAMAGED,
            }));
        const resolvedGoodsReceiptId = dto.goodsReceiptId ?? existing.goodsReceiptId;
        if (!resolvedGoodsReceiptId) {
            throw new common_1.BadRequestException('goodsReceiptId is required');
        }
        const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date(existing.returnDate);
        (0, date_guards_1.assertNotFuture)(returnDate);
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const draft = await this.resolveSupplierDraftData(tx, user, {
                goodsReceiptId: resolvedGoodsReceiptId,
                shopId: dto.shopId ?? existing.shopId,
                supplierRef: dto.supplierRef ?? existing.supplierRef ?? undefined,
                remarks: dto.remarks ?? existing.remarks ?? undefined,
                internalCcEmail: dto.internalCcEmail ?? existing.internalCcEmail ?? undefined,
                items: resolvedItems,
            }, existing.id);
            await tx.supplierReturnItem.deleteMany({ where: { returnId: id } });
            const updated = await tx.supplierReturn.update({
                where: { id },
                data: {
                    returnDate,
                    shopId: draft.goodsReceipt.shopId,
                    supplierName: draft.supplierName,
                    supplierId: draft.supplier.id,
                    purchaseOrderId: draft.goodsReceipt.purchaseOrderId ?? null,
                    goodsReceiptId: draft.goodsReceipt.id,
                    supplierRef: (dto.supplierRef ?? existing.supplierRef ?? null)?.trim?.() ??
                        dto.supplierRef ??
                        existing.supplierRef ??
                        null,
                    remarks: (dto.remarks ?? existing.remarks ?? null)?.trim?.() ??
                        dto.remarks ??
                        existing.remarks ??
                        null,
                    internalCcEmail: (dto.internalCcEmail ?? existing.internalCcEmail ?? null)?.trim?.() ??
                        dto.internalCcEmail ??
                        existing.internalCcEmail ??
                        null,
                    totalValue: draft.total,
                    updatedById: user.id,
                    items: { create: draft.items },
                },
                include: supplierReturnInclude,
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'SUPPLIER_RETURN',
                entityId: updated.id,
                newValues: {
                    goodsReceiptId: updated.goodsReceiptId,
                    totalValue: updated.totalValue.toString(),
                    itemCount: updated.items.length,
                },
            }, tx);
            return updated;
        });
    }
    async uploadSupplierReturnImage(user, id, dto, file) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException('Images can only be uploaded while the return is in draft');
        }
        if (dto.returnItemId && !ret.items.some((item) => item.id === dto.returnItemId)) {
            throw new common_1.BadRequestException('Selected return item does not belong to this return order');
        }
        const stored = await this.returnImages.store(id, file);
        return this.prisma.supplierReturnImage.create({
            data: {
                returnId: id,
                returnItemId: dto.returnItemId ?? null,
                filePath: stored.filePath,
                publicUrl: stored.publicUrl,
                originalFilename: stored.originalFilename,
                mimeType: stored.mimeType,
                createdById: user.id,
            },
        });
    }
    async removeSupplierReturnImage(user, id, imageId) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException('Images can only be removed while the return is in draft');
        }
        const image = await this.prisma.supplierReturnImage.findFirst({
            where: { id: imageId, returnId: id },
        });
        if (!image)
            throw new common_1.NotFoundException('Return image not found');
        await this.prisma.supplierReturnImage.delete({ where: { id: image.id } });
        await this.returnImages.remove(image.filePath);
        return { deleted: true, id: image.id };
    }
    buildSupplierReturnEmailContent(ret, acknowledgementUrl) {
        return {
            supplierName: ret.supplier?.supplierName ?? ret.supplierName,
            returnNumber: ret.returnNumber,
            returnDate: ret.returnDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }),
            grNumber: ret.goodsReceipt?.grNumber ?? '—',
            shopName: ret.shop.shopName,
            companyName: ret.shop.company?.companyName ?? 'Softdigit Consulting',
            supplierRef: ret.supplierRef,
            remarks: ret.remarks,
            acknowledgementUrl,
            lines: ret.items.map((item) => ({
                code: item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? item.productId,
                description: item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '',
                grnQuantity: item.grnQuantity?.toString() ?? item.goodsReceiptItem?.quantity.toString() ?? '0',
                returnQuantity: item.quantity.toString(),
                reason: reasonLabel(item.reasonCode),
                imageCount: item.images.length,
            })),
        };
    }
    async submitSupplierReturn(user, id) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft supplier returns can be submitted');
        }
        if (!ret.items.length) {
            throw new common_1.BadRequestException('Add at least one return line before submitting');
        }
        const supplierEmail = ret.supplier?.email?.trim();
        if (!supplierEmail) {
            throw new common_1.BadRequestException(`Supplier "${ret.supplierName}" must have an email address before submitting a return notice.`);
        }
        const ackToken = (0, crypto_1.randomBytes)(24).toString('hex');
        const ackTokenHash = hashToken(ackToken);
        const acknowledgementUrl = (0, portal_url_1.buildSupplierReturnAckUrl)(this.config, ackToken);
        const content = this.buildSupplierReturnEmailContent(ret, acknowledgementUrl);
        const defaults = (0, email_notifications_outbound_1.returnNoticeDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(ret.shopId, 'supplier_return_notice', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Supplier return email notifications are disabled in settings.');
        }
        if (!ret.shop.companyId) {
            throw new common_1.BadRequestException('Shop is not linked to a company');
        }
        const delivery = await this.documentEmail.sendGoodsReturnEmail(user, {
            returnId: id,
            companyId: ret.shop.companyId,
            shopId: ret.shopId,
            recipient: supplierEmail,
            content,
            prepared,
            documentNumber: ret.returnNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
            cc: ret.internalCcEmail?.trim() || undefined,
        });
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.supplierReturn.update({
                where: { id },
                data: {
                    status: client_1.ReturnStatus.SUBMITTED,
                    submittedAt: new Date(),
                    emailSentAt: delivery.sent ? new Date() : null,
                    ackTokenHash,
                    emailMessageId: null,
                    updatedById: user.id,
                },
                include: supplierReturnInclude,
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'SUPPLIER_RETURN',
                entityId: updated.id,
                newValues: {
                    status: updated.status,
                    emailSentAt: updated.emailSentAt?.toISOString(),
                },
            }, tx);
            return updated;
        });
    }
    async sendSupplierReturnNotice(user, id, options) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status === client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException('Submit the return before resending the notice email');
        }
        const supplierEmail = ret.supplier?.email?.trim();
        if (!supplierEmail) {
            throw new common_1.BadRequestException(`Supplier "${ret.supplierName}" must have an email address before sending a return notice.`);
        }
        if (!ret.shop.companyId) {
            throw new common_1.BadRequestException('Shop is not linked to a company');
        }
        const ackToken = (0, crypto_1.randomBytes)(24).toString('hex');
        const acknowledgementUrl = (0, portal_url_1.buildSupplierReturnAckUrl)(this.config, ackToken);
        const content = this.buildSupplierReturnEmailContent(ret, acknowledgementUrl);
        const defaults = (0, email_notifications_outbound_1.returnNoticeDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(ret.shopId, 'supplier_return_notice', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Supplier return email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        const delivery = await this.documentEmail.sendGoodsReturnEmail(user, {
            returnId: id,
            companyId: ret.shop.companyId,
            shopId: ret.shopId,
            recipient: supplierEmail,
            content,
            prepared,
            documentNumber: ret.returnNumber,
            trigger,
            cc: ret.internalCcEmail?.trim() || undefined,
        });
        if (delivery.sent || delivery.queued) {
            await this.prisma.supplierReturn.update({
                where: { id },
                data: {
                    ackTokenHash: hashToken(ackToken),
                    emailSentAt: delivery.sent ? new Date() : ret.emailSentAt,
                    updatedById: user.id,
                },
            });
        }
        return delivery;
    }
    async cancelSupplierReturn(user, id) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status === client_1.ReturnStatus.CANCELLED)
            return ret;
        if (ret.status === client_1.ReturnStatus.DONE || ret.status === client_1.ReturnStatus.POSTED) {
            throw new common_1.BadRequestException('Posted supplier returns cannot be cancelled');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.supplierReturn.update({
                where: { id },
                data: {
                    status: client_1.ReturnStatus.CANCELLED,
                    updatedById: user.id,
                },
                include: supplierReturnInclude,
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'SUPPLIER_RETURN',
                entityId: updated.id,
                newValues: { status: updated.status },
            }, tx);
            return updated;
        });
    }
    async postSupplierReturnStock(tx, ret, userId, remarks) {
        const shop = await tx.shop.findUnique({
            where: { id: ret.shopId },
            select: { costingMethod: true },
        });
        const method = shop?.costingMethod ?? client_1.CostingMethod.AVERAGE;
        for (const line of ret.items) {
            const { unitCost } = await this.costing.recordOutflow(tx, {
                shopId: ret.shopId,
                productId: line.productId,
                qty: new client_1.Prisma.Decimal(line.quantity),
                method,
            });
            await this.stock.postMovementOnce(tx, {
                type: client_1.TransactionType.GOODS_ISSUE,
                ref: ret.returnNumber,
                date: ret.returnDate,
                shopId: ret.shopId,
                productId: line.productId,
                inQty: 0,
                outQty: Number(line.quantity),
                unitRate: unitCost.gt(0) ? unitCost : new client_1.Prisma.Decimal(line.unitCost),
                remarks,
                sourceType: 'SUPPLIER_RETURN',
                sourceId: ret.id,
                sourceLineId: line.id,
                idempotencyKey: `sup-ret:${ret.id}:${line.id}`,
                userId,
            });
        }
    }
    async postSupplierReturn(user, id) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status === client_1.ReturnStatus.POSTED || ret.status === client_1.ReturnStatus.DONE)
            return ret;
        if (ret.goodsReceiptId) {
            throw new common_1.BadRequestException('Goods-receipt return orders must be acknowledged by the supplier before stock is deducted');
        }
        if (ret.status !== client_1.ReturnStatus.DRAFT) {
            throw new common_1.BadRequestException(`Cannot post return in status ${ret.status}`);
        }
        return this.prisma.$transaction(async (tx) => {
            const transitioned = await tx.supplierReturn.updateMany({
                where: { id, status: client_1.ReturnStatus.DRAFT },
                data: { status: client_1.ReturnStatus.POSTED, postedAt: new Date(), updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new common_1.ConflictException('Supplier return state changed concurrently');
            }
            await this.postSupplierReturnStock(tx, ret, user.id, 'Supplier return');
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'SUPPLIER_RETURN',
                entityId: ret.id,
                newValues: { status: client_1.ReturnStatus.POSTED },
            }, tx);
            return tx.supplierReturn.findUniqueOrThrow({
                where: { id },
                include: supplierReturnInclude,
            });
        });
    }
    async manuallyAcknowledgeSupplierReturn(user, id) {
        const ret = await this.getSupplierReturnRecord(user, id);
        if (ret.status === client_1.ReturnStatus.DONE || ret.status === client_1.ReturnStatus.POSTED) {
            return ret;
        }
        if (ret.status !== client_1.ReturnStatus.SUBMITTED) {
            throw new common_1.BadRequestException(`Only submitted returns can be manually accepted (current status: ${ret.status})`);
        }
        return this.prisma.$transaction(async (tx) => {
            const transitioned = await tx.supplierReturn.updateMany({
                where: { id, status: client_1.ReturnStatus.SUBMITTED },
                data: {
                    status: client_1.ReturnStatus.ACKNOWLEDGED,
                    acknowledgedAt: new Date(),
                },
            });
            if (transitioned.count === 0) {
                throw new common_1.ConflictException('Supplier return state changed concurrently');
            }
            await this.postSupplierReturnStock(tx, ret, user.id, 'Supplier return manually accepted');
            const updated = await tx.supplierReturn.update({
                where: { id },
                data: {
                    status: client_1.ReturnStatus.DONE,
                    postedAt: new Date(),
                    updatedById: user.id,
                },
                include: supplierReturnInclude,
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'SUPPLIER_RETURN',
                entityId: updated.id,
                newValues: {
                    status: updated.status,
                    acknowledgedAt: updated.acknowledgedAt?.toISOString(),
                    postedAt: updated.postedAt?.toISOString(),
                    manualAcknowledge: true,
                },
            }, tx);
            return updated;
        });
    }
    async findSupplierReturnByToken(token) {
        const ackTokenHash = hashToken(token);
        const ret = await this.prisma.supplierReturn.findFirst({
            where: { ackTokenHash },
            include: supplierReturnInclude,
        });
        if (!ret) {
            throw new common_1.NotFoundException('This acknowledgement link is invalid or has expired');
        }
        return ret;
    }
    toSupplierReturnPortalView(ret) {
        return {
            id: ret.id,
            returnNumber: ret.returnNumber,
            returnDate: ret.returnDate,
            status: ret.status,
            canAcknowledge: ret.status === client_1.ReturnStatus.SUBMITTED,
            acknowledgedAt: ret.acknowledgedAt,
            postedAt: ret.postedAt,
            supplierName: ret.supplier?.supplierName ?? ret.supplierName,
            grNumber: ret.goodsReceipt?.grNumber ?? '—',
            shopName: ret.shop.shopName,
            supplierRef: ret.supplierRef,
            remarks: ret.remarks,
            items: ret.items.map((item) => ({
                id: item.id,
                productCode: item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? '',
                description: item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '',
                grnQuantity: item.grnQuantity?.toString() ?? item.goodsReceiptItem?.quantity.toString() ?? '0',
                returnQuantity: item.quantity.toString(),
                reason: reasonLabel(item.reasonCode),
                images: item.images.map((image) => ({
                    id: image.id,
                    url: image.publicUrl,
                    filename: image.originalFilename,
                })),
            })),
        };
    }
    async getSupplierReturnPublic(token) {
        const ret = await this.findSupplierReturnByToken(token);
        return this.toSupplierReturnPortalView(ret);
    }
    async acknowledgeSupplierReturn(token) {
        const ret = await this.findSupplierReturnByToken(token);
        if (ret.status === client_1.ReturnStatus.DONE || ret.status === client_1.ReturnStatus.POSTED) {
            return {
                message: 'This return notice has already been acknowledged and stock has already been adjusted.',
                returnOrder: this.toSupplierReturnPortalView(ret),
            };
        }
        if (ret.status !== client_1.ReturnStatus.SUBMITTED) {
            throw new common_1.BadRequestException('This return notice is no longer awaiting acknowledgement');
        }
        const userId = ret.createdById ?? ret.updatedById;
        if (!userId) {
            throw new common_1.BadRequestException('Return order is missing its creator reference');
        }
        return this.prisma.$transaction(async (tx) => {
            const transitioned = await tx.supplierReturn.updateMany({
                where: { id: ret.id, status: client_1.ReturnStatus.SUBMITTED },
                data: {
                    status: client_1.ReturnStatus.ACKNOWLEDGED,
                    acknowledgedAt: new Date(),
                },
            });
            if (transitioned.count === 0) {
                const latest = await tx.supplierReturn.findUnique({
                    where: { id: ret.id },
                    include: supplierReturnInclude,
                });
                if (!latest) {
                    throw new common_1.NotFoundException('Supplier return not found');
                }
                return {
                    message: 'This return notice has already been acknowledged and stock has already been adjusted.',
                    returnOrder: this.toSupplierReturnPortalView(latest),
                };
            }
            await this.postSupplierReturnStock(tx, ret, userId, 'Supplier return acknowledged');
            const updated = await tx.supplierReturn.update({
                where: { id: ret.id },
                data: {
                    status: client_1.ReturnStatus.DONE,
                    postedAt: new Date(),
                    updatedById: userId,
                },
                include: supplierReturnInclude,
            });
            await this.audit.log({
                companyId: ret.shop.companyId,
                userId,
                action: client_1.AuditAction.POST,
                entityType: 'SUPPLIER_RETURN',
                entityId: updated.id,
                newValues: {
                    status: updated.status,
                    acknowledgedAt: updated.acknowledgedAt?.toISOString(),
                    postedAt: updated.postedAt?.toISOString(),
                },
            }, tx);
            return {
                message: 'Thank you. Your acknowledgement has been recorded and stock has been adjusted.',
                returnOrder: this.toSupplierReturnPortalView(updated),
            };
        });
    }
    async getSupplierReturn(user, id) {
        return this.getSupplierReturnRecord(user, id);
    }
    async listCustomerReturns(user) {
        return this.prisma.customerReturn.findMany({
            where: { shop: (0, shop_scope_1.shopListWhere)(user) },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: { customer: true },
        });
    }
    async listSupplierReturns(user) {
        return this.prisma.supplierReturn.findMany({
            where: { shop: (0, shop_scope_1.shopListWhere)(user) },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: supplierReturnInclude,
        });
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        costing_service_1.CostingService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService,
        config_1.ConfigService,
        return_image_storage_service_1.ReturnImageStorageService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map