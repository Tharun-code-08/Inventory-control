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
exports.SupplierBillsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const shop_scope_1 = require("../../common/utils/shop-scope");
const money_1 = require("../../common/utils/money");
const pagination_1 = require("../../common/utils/pagination");
const audit_service_1 = require("../audit/audit.service");
const document_number_service_1 = require("../stock/document-number.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_email_service_1 = require("../document-email/document-email.service");
const assert_action_1 = require("../../common/state-machines/assert-action");
const document_actions_1 = require("../../common/state-machines/document-actions");
const document_audit_1 = require("../../common/state-machines/document-audit");
const procurement_downstream_1 = require("../../common/utils/procurement-downstream");
const assert_transition_1 = require("../../common/state-machines/assert-transition");
let SupplierBillsService = class SupplierBillsService {
    prisma;
    audit;
    numbers;
    emailNotifications;
    documentEmail;
    constructor(prisma, audit, numbers, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.audit = audit;
        this.numbers = numbers;
        this.emailNotifications = emailNotifications;
        this.documentEmail = documentEmail;
    }
    async list(user, query = {}) {
        const take = (0, pagination_1.clampTake)(query.take);
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(query.shop_id ? { shopId: query.shop_id } : {}),
        };
        if (query.status)
            where.status = query.status;
        if (query.supplier_id)
            where.supplierId = query.supplier_id;
        if (query.date_from || query.date_to) {
            where.billDate = {};
            if (query.date_from)
                where.billDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.billDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.supplierBillHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                billNumber: true,
                billDate: true,
                dueDate: true,
                status: true,
                totalValue: true,
                paidValue: true,
                purchaseOrderId: true,
                goodsReceiptId: true,
                shopId: true,
                supplierId: true,
                supplier: { select: { id: true, supplierCode: true, supplierName: true } },
                purchaseOrder: { select: { poNumber: true } },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async get(user, id) {
        const bill = await this.prisma.supplierBillHeader.findUnique({
            where: { id },
            include: {
                supplier: true,
                purchaseOrder: true,
                goodsReceipt: true,
                items: { include: { product: true } },
                payments: true,
            },
        });
        if (!bill)
            throw new common_1.NotFoundException('Supplier bill not found');
        (0, shop_scope_1.assertShopScope)(user, bill.shopId);
        return bill;
    }
    async createFromGoodsReceipt(user, goodsReceiptId, dto = {}) {
        const bill = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${'gr-bill:' + goodsReceiptId}::text))`;
            const gr = await tx.goodsReceiptHeader.findUnique({
                where: { id: goodsReceiptId },
                include: {
                    items: true,
                    purchaseOrder: true,
                    supplierBills: { select: { id: true, status: true } },
                    shop: { select: { id: true, companyId: true } },
                },
            });
            if (!gr)
                throw new common_1.NotFoundException('Goods receipt not found');
            (0, shop_scope_1.assertShopScope)(user, gr.shopId);
            (0, assert_action_1.assertGrAction)(gr.status, document_actions_1.GrAction.CREATE_BILL);
            if (await (0, procurement_downstream_1.grHasOpenBill)(tx, gr.id)) {
                throw new common_1.ConflictException('This goods receipt has already been billed');
            }
            if (!gr.items.length) {
                throw new common_1.BadRequestException('Goods receipt has no line items');
            }
            const companyId = gr.shop.companyId;
            if (!companyId) {
                throw new common_1.BadRequestException('Shop not linked to a company');
            }
            let supplierId = dto.supplierId;
            if (supplierId) {
                const supplier = await tx.supplier.findUnique({
                    where: { id: supplierId },
                    select: { companyId: true },
                });
                if (!supplier)
                    throw new common_1.NotFoundException('Supplier not found');
                (0, shop_scope_1.assertSupplierInTenant)(user, supplier.companyId);
            }
            else {
                const supplierName = gr.supplierName.trim();
                const supplier = await tx.supplier.findFirst({
                    where: {
                        companyId,
                        supplierName: { equals: supplierName, mode: 'insensitive' },
                    },
                    select: { id: true },
                });
                if (!supplier) {
                    throw new common_1.BadRequestException(`Supplier "${supplierName}" not found. Provide supplierId in the request body.`);
                }
                supplierId = supplier.id;
            }
            const billDate = dto.billDate ? new Date(dto.billDate) : gr.grDate;
            const totalValue = (0, money_1.roundMoney)(gr.items.reduce((sum, item) => sum.add(item.lineValue), new client_1.Prisma.Decimal(0)));
            (0, money_1.assertNonNegativeMoney)(totalValue, 'Supplier bill total');
            const billNumber = dto.billNumber?.trim() ||
                (await this.numbers.nextNumber(tx, {
                    shopId: gr.shopId,
                    docType: 'SBILL',
                    prefix: 'SBILL',
                    date: billDate,
                }));
            const bill = await tx.supplierBillHeader.create({
                data: {
                    billNumber,
                    billDate,
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    shopId: gr.shopId,
                    supplierId,
                    purchaseOrderId: gr.purchaseOrderId,
                    goodsReceiptId: gr.id,
                    status: client_1.SupplierBillStatus.ISSUED,
                    totalValue,
                    paidValue: new client_1.Prisma.Decimal(0),
                    remarks: dto.remarks ?? null,
                    createdById: user.id,
                    items: {
                        create: gr.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            uom: item.uom,
                            unitCost: item.purchaseRate,
                            lineValue: item.lineValue,
                        })),
                    },
                },
                include: {
                    supplier: true,
                    purchaseOrder: true,
                    goodsReceipt: true,
                    items: { include: { product: true } },
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'SUPPLIER_BILL',
                entityId: bill.id,
                newValues: {
                    billNumber: bill.billNumber,
                    supplierId: bill.supplierId,
                    totalValue: bill.totalValue.toString(),
                    goodsReceiptId: bill.goodsReceiptId,
                    purchaseOrderId: bill.purchaseOrderId,
                    status: bill.status,
                },
            }, tx);
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_BILL',
                entityId: bill.id,
                fromStatus: client_1.SupplierBillStatus.DRAFT,
                toStatus: client_1.SupplierBillStatus.ISSUED,
                reason: 'createFromGoodsReceipt',
                action: client_1.AuditAction.POST,
            }), tx);
            await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_BILL',
                entityId: bill.id,
                action: 'CREATE_BILL_FROM_GR',
                result: 'success',
                detail: { goodsReceiptId: gr.id },
            }), tx);
            return bill;
        });
        await this.autoSendSupplierBillEmail(user, bill).catch(() => undefined);
        return bill;
    }
    async sendToSupplier(user, id, options) {
        const bill = await this.get(user, id);
        (0, assert_action_1.assertSupplierBillAction)(bill.status, document_actions_1.SupplierBillAction.SEND);
        const recipient = bill.supplier.email?.trim();
        if (!recipient) {
            throw new common_1.BadRequestException(`Supplier email is missing for "${bill.supplier.supplierName}". Add an email on the supplier record and try again.`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: bill.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const content = this.buildSupplierBillEmailContent(bill, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.supplierBillIssuedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(bill.shopId, 'supplier_bill_issued', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Supplier bill email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        const result = await this.documentEmail.sendSupplierBillEmail(user, {
            billId: id,
            companyId: shop.companyId,
            shopId: bill.shopId,
            recipient,
            content,
            prepared,
            documentNumber: bill.billNumber,
            trigger,
        });
        await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
            companyId: (0, assert_company_id_1.assertCompanyId)(user),
            userId: user.id,
            entityType: 'SUPPLIER_BILL',
            entityId: id,
            action: options?.resend ? 'RESEND_SUPLIER_BILL' : 'SEND_SUPPLIER_BILL',
            result: 'success',
            detail: { recipient, queued: result.queued ?? false },
        }));
        return result;
    }
    async voidBill(user, id, dto = {}) {
        const bill = await this.get(user, id);
        if (bill.status === client_1.SupplierBillStatus.VOID)
            return bill;
        (0, assert_action_1.assertSupplierBillAction)(bill.status, document_actions_1.SupplierBillAction.VOID);
        await (0, procurement_downstream_1.assertSupplierBillMutationAllowed)(this.prisma, { billId: id, action: 'void' });
        (0, assert_transition_1.assertSupplierBillTransition)(bill.status, client_1.SupplierBillStatus.VOID);
        const reason = dto.reason?.trim() || null;
        return this.prisma.$transaction(async (tx) => {
            const transitioned = await tx.supplierBillHeader.updateMany({
                where: {
                    id,
                    status: client_1.SupplierBillStatus.ISSUED,
                    paidValue: new client_1.Prisma.Decimal(0),
                },
                data: {
                    status: client_1.SupplierBillStatus.VOID,
                    updatedById: user.id,
                    ...(reason ? { remarks: reason } : {}),
                },
            });
            if (transitioned.count === 0) {
                throw new common_1.BadRequestException('Only unpaid issued supplier bills can be voided');
            }
            const updated = await tx.supplierBillHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    supplier: true,
                    purchaseOrder: true,
                    goodsReceipt: true,
                    items: { include: { product: true } },
                },
            });
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_BILL',
                entityId: id,
                fromStatus: client_1.SupplierBillStatus.ISSUED,
                toStatus: client_1.SupplierBillStatus.VOID,
                reason,
            }), tx);
            await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_BILL',
                entityId: id,
                action: 'VOID_SUPPLIER_BILL',
                result: 'success',
                detail: { reason },
            }), tx);
            return updated;
        });
    }
    buildSupplierBillEmailContent(bill, companyName) {
        return {
            supplierName: bill.supplier.supplierName,
            billNumber: bill.billNumber,
            billDate: (0, email_formatters_1.formatEmailDate)(bill.billDate),
            dueDate: (0, email_formatters_1.formatEmailDate)(bill.dueDate),
            totalAmount: (0, email_formatters_1.formatEmailMoney)(bill.totalValue),
            poNumber: bill.purchaseOrder?.poNumber ?? '—',
            companyName,
        };
    }
    async autoSendSupplierBillEmail(user, bill) {
        const recipient = bill.supplier.email?.trim();
        if (!recipient)
            return;
        const shop = await this.prisma.shop.findUnique({
            where: { id: bill.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId)
            return;
        const content = this.buildSupplierBillEmailContent(bill, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.supplierBillIssuedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(bill.shopId, 'supplier_bill_issued', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendSupplierBillEmail(user, {
            billId: bill.id,
            companyId: shop.companyId,
            shopId: bill.shopId,
            recipient,
            content,
            prepared,
            documentNumber: bill.billNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
};
exports.SupplierBillsService = SupplierBillsService;
exports.SupplierBillsService = SupplierBillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        document_number_service_1.DocumentNumberService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], SupplierBillsService);
//# sourceMappingURL=supplier-bills.service.js.map