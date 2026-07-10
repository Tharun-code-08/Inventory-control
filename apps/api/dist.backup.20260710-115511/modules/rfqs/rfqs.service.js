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
exports.RfqsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const assert_action_1 = require("../../common/state-machines/assert-action");
const assert_transition_1 = require("../../common/state-machines/assert-transition");
const document_audit_1 = require("../../common/state-machines/document-audit");
const document_actions_1 = require("../../common/state-machines/document-actions");
const audit_service_1 = require("../audit/audit.service");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const shop_scope_1 = require("../../common/utils/shop-scope");
const shop_access_1 = require("../../common/utils/shop-access");
const document_number_service_1 = require("../stock/document-number.service");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const document_email_pdf_1 = require("../../common/pdf/document-email-pdf");
function isUniqueViolationForFields(error, fields) {
    if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return false;
    }
    const target = Array.isArray(error.meta?.target)
        ? (error.meta.target ?? [])
        : [];
    return fields.some((field) => target.includes(field));
}
let RfqsService = class RfqsService {
    prisma;
    numbers;
    mail;
    subscriptions;
    emailNotifications;
    audit;
    constructor(prisma, numbers, mail, subscriptions, emailNotifications, audit) {
        this.prisma = prisma;
        this.numbers = numbers;
        this.mail = mail;
        this.subscriptions = subscriptions;
        this.emailNotifications = emailNotifications;
        this.audit = audit;
    }
    async list(user) {
        const rfqs = await this.prisma.rfqHeader.findMany({
            where: { shop: (0, shop_scope_1.shopListWhere)(user) },
            orderBy: { createdAt: 'desc' },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
        const withFulfillment = await Promise.all(rfqs.map(async (rfq) => ({
            ...rfq,
            fulfillment: await this.buildFulfillmentSummary(rfq.id, rfq.items),
        })));
        return withFulfillment;
    }
    async resolveRfqShopId(user, shopId) {
        if (shopId) {
            await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, shopId);
            return shopId;
        }
        if (user.shopId) {
            await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, user.shopId);
            return user.shopId;
        }
        if (user.companyId) {
            const shop = await this.prisma.shop.findFirst({
                where: { companyId: user.companyId, isActive: true },
                orderBy: { shopNumber: 'asc' },
                select: { id: true },
            });
            if (shop)
                return shop.id;
        }
        throw new common_1.BadRequestException('No plant is available for RFQ numbering. Add a plant under Master Data first.');
    }
    async create(user, dto) {
        const shopId = await this.resolveRfqShopId(user, dto.shopId ?? user.shopId);
        await this.subscriptions.assertFeatureForShop(shopId, 'rfqs');
        const rfqDate = dto.rfqDate ? new Date(dto.rfqDate) : new Date();
        return this.prisma.$transaction(async (tx) => {
            const shop = await tx.shop.findUnique({
                where: { id: shopId },
                select: { shopNumber: true },
            });
            if (!shop) {
                throw new common_1.BadRequestException('Invalid shopId');
            }
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const rfqNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                    shopId,
                    docType: 'RFQ',
                    date: rfqDate,
                });
                try {
                    return await tx.rfqHeader.create({
                        data: {
                            rfqNumber,
                            rfqDate,
                            deadline: dto.deadline ? new Date(dto.deadline) : null,
                            title: dto.title,
                            notes: dto.notes ?? null,
                            shopId,
                            status: client_1.DocumentStatus.DRAFT,
                            createdById: user.id,
                            suppliers: {
                                create: (dto.suppliers ?? []).map((supplierId) => ({ supplierId })),
                            },
                            items: {
                                create: (dto.items ?? []).map((item) => ({
                                    productId: item.productId ?? null,
                                    description: item.description ?? null,
                                    quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                                    uom: item.uom ?? 'UNIT',
                                    specifications: item.specifications ?? null,
                                    createdById: user.id,
                                })),
                            },
                        },
                        include: {
                            shop: true,
                            suppliers: { include: { supplier: true } },
                            items: { include: { product: true } },
                        },
                    });
                }
                catch (error) {
                    const canRetry = attempt < maxAttempts &&
                        isUniqueViolationForFields(error, ['rfq_number', 'rfqNumber']);
                    if (canRetry)
                        continue;
                    throw error;
                }
            }
            throw new common_1.BadRequestException('Unable to reserve a unique RFQ number. Please retry.');
        });
    }
    async get(user, id) {
        const rfq = await this.prisma.rfqHeader.findUnique({
            where: { id },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
        if (!rfq)
            throw new common_1.NotFoundException('RFQ not found');
        await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, rfq.shopId);
        await this.subscriptions.assertFeatureForShop(rfq.shopId, 'rfqs');
        const fulfillment = await this.buildFulfillmentSummary(rfq.id, rfq.items);
        return { ...rfq, fulfillment };
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        (0, assert_action_1.assertRfqAction)(existing.status, document_actions_1.RfqAction.EDIT);
        await this.subscriptions.assertFeatureForShop(existing.shopId, 'rfqs');
        const expectedUpdatedAt = dto.ifUnmodifiedSince ? new Date(dto.ifUnmodifiedSince) : null;
        if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
            throw new common_1.BadRequestException('Invalid optimistic lock timestamp');
        }
        return this.prisma.$transaction(async (tx) => {
            if (expectedUpdatedAt) {
                const claimed = await tx.rfqHeader.updateMany({
                    where: { id, updatedAt: expectedUpdatedAt },
                    data: { updatedById: user.id },
                });
                if (claimed.count === 0) {
                    throw new common_1.ConflictException('RFQ has been modified by another user. Refresh and try again.');
                }
            }
            await tx.rfqSupplier.deleteMany({ where: { rfqId: id } });
            await tx.rfqItem.deleteMany({ where: { rfqHeaderId: id } });
            const updated = await tx.rfqHeader.update({
                where: { id },
                data: {
                    rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : existing.rfqDate,
                    deadline: dto.deadline ? new Date(dto.deadline) : null,
                    title: dto.title ?? existing.title,
                    notes: dto.notes ?? null,
                    updatedById: user.id,
                    suppliers: {
                        create: (dto.suppliers ?? []).map((supplierId) => ({ supplierId })),
                    },
                    items: {
                        create: (dto.items ?? []).map((item) => ({
                            productId: item.productId ?? null,
                            description: item.description ?? null,
                            quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                            uom: item.uom ?? 'UNIT',
                            specifications: item.specifications ?? null,
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    shop: true,
                    suppliers: { include: { supplier: true } },
                    items: { include: { product: true } },
                },
            });
            return updated;
        });
    }
    inviteRecipients(suppliers) {
        return suppliers.map((row) => ({
            supplierId: row.supplierId,
            supplierName: row.supplier?.supplierName ?? 'Supplier',
            email: row.supplier?.email ?? '',
        }));
    }
    assertEmailDelivery(emailDelivery) {
        if (!emailDelivery.configured) {
            throw new common_1.BadRequestException('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env, then restart the API.');
        }
        if (emailDelivery.sent === 0) {
            const detail = emailDelivery.results
                .map((r) => (r.error ? `${r.supplierName}: ${r.error}` : r.supplierName))
                .join('; ');
            throw new common_1.BadRequestException(`No supplier emails were delivered. ${detail || 'Check SMTP settings and supplier email addresses.'}`);
        }
    }
    async buildRfqPdfAttachments(rfq) {
        return (0, document_email_pdf_1.tryRenderDocumentPdfAttachment)({
            title: 'Request for Quotation',
            documentNumber: rfq.rfqNumber,
            documentDate: rfq.deadline
                ? rfq.deadline.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })
                : undefined,
            partyLabel: 'RFQ Title',
            partyName: rfq.title,
            companyName: rfq.shop.shopName,
            summaryLines: [
                { label: 'RFQ Number', value: rfq.rfqNumber },
                { label: 'Deadline', value: rfq.deadline?.toLocaleDateString('en-GB') ?? '—' },
            ],
            tableHeaders: ['Product', 'Qty'],
            tableRows: (rfq.items ?? []).map((item) => [
                String(item.product?.description ?? item.productId ?? ''),
                String(item.quantity ?? ''),
            ]),
        }, 'rfq');
    }
    skipRfqInviteEmailInTest() {
        return process.env.NODE_ENV === 'test' || process.env.CI === 'true';
    }
    async send(user, id) {
        const existing = await this.get(user, id);
        const isFirstSend = existing.status === client_1.DocumentStatus.DRAFT;
        (0, assert_action_1.assertRfqAction)(existing.status, isFirstSend ? document_actions_1.RfqAction.POST : document_actions_1.RfqAction.SEND);
        const suppliers = existing.suppliers ?? [];
        if (suppliers.length === 0) {
            throw new common_1.BadRequestException('Add at least one supplier before sending the RFQ');
        }
        if (!existing.shop.companyId) {
            throw new common_1.BadRequestException('Shop is not linked to a company');
        }
        if (this.skipRfqInviteEmailInTest() && isFirstSend) {
            (0, assert_transition_1.assertRfqTransition)(existing.status, client_1.DocumentStatus.POSTED);
            const transitioned = await this.prisma.rfqHeader.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: {
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    updatedById: user.id,
                },
            });
            if (transitioned.count === 0) {
                throw new common_1.BadRequestException('RFQ is not in DRAFT state');
            }
            return this.prisma.rfqHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    shop: true,
                    suppliers: { include: { supplier: true } },
                    items: { include: { product: true } },
                },
            });
        }
        const attachments = await this.buildRfqPdfAttachments(existing);
        const config = await this.emailNotifications.resolveConfigForShop(existing.shopId);
        const emailDelivery = await this.mail.sendRfqInvites({
            companyId: existing.shop.companyId,
            rfqId: existing.id,
            rfqNumber: existing.rfqNumber,
            rfqTitle: existing.title,
            deadline: existing.deadline,
            recipients: this.inviteRecipients(suppliers),
            shopId: existing.shopId,
            attachments,
            prepareInvite: (content) => {
                const defaults = (0, email_notifications_outbound_1.rfqInviteDefaults)(content);
                return this.emailNotifications.prepareTemplate(config, 'rfq_invite', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
            },
        });
        this.assertEmailDelivery(emailDelivery);
        if (isFirstSend) {
            (0, assert_transition_1.assertRfqTransition)(existing.status, client_1.DocumentStatus.POSTED);
            const transitioned = await this.prisma.rfqHeader.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: {
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    updatedById: user.id,
                    notes: `${existing.notes ?? ''}\n[Sent ${new Date().toISOString()}]`.trim(),
                },
            });
            if (transitioned.count === 0) {
                throw new common_1.BadRequestException('RFQ is not in DRAFT state');
            }
            const rfq = await this.prisma.rfqHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    shop: true,
                    suppliers: { include: { supplier: true } },
                    items: { include: { product: true } },
                },
            });
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'RFQ',
                entityId: id,
                fromStatus: client_1.DocumentStatus.DRAFT,
                toStatus: client_1.DocumentStatus.POSTED,
                action: client_1.AuditAction.POST,
            }));
            await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'RFQ',
                entityId: id,
                action: 'POST_RFQ',
                result: 'success',
                detail: { recipients: emailDelivery.sent },
            }));
            return { ...rfq, emailDelivery };
        }
        await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
            companyId: (0, assert_company_id_1.assertCompanyId)(user),
            userId: user.id,
            entityType: 'RFQ',
            entityId: id,
            action: 'SEND_RFQ',
            result: 'success',
            detail: { recipients: emailDelivery.sent },
        }));
        const rfq = await this.prisma.rfqHeader.findUniqueOrThrow({
            where: { id },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
        return { ...rfq, emailDelivery };
    }
    async resendInvites(user, id) {
        const existing = await this.get(user, id);
        (0, assert_action_1.assertRfqAction)(existing.status, document_actions_1.RfqAction.SEND);
        const suppliers = existing.suppliers ?? [];
        if (suppliers.length === 0) {
            throw new common_1.BadRequestException('This RFQ has no suppliers');
        }
        if (!existing.shop.companyId) {
            throw new common_1.BadRequestException('Shop is not linked to a company');
        }
        const config = await this.emailNotifications.resolveConfigForShop(existing.shopId);
        const attachments = await this.buildRfqPdfAttachments(existing);
        const emailDelivery = await this.mail.sendRfqInvites({
            companyId: existing.shop.companyId,
            rfqId: existing.id,
            rfqNumber: existing.rfqNumber,
            rfqTitle: existing.title,
            deadline: existing.deadline,
            recipients: this.inviteRecipients(suppliers),
            shopId: existing.shopId,
            attachments,
            prepareInvite: (content) => {
                const defaults = (0, email_notifications_outbound_1.rfqInviteDefaults)(content);
                return this.emailNotifications.prepareTemplate(config, 'rfq_invite', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
            },
        });
        this.assertEmailDelivery(emailDelivery);
        await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
            companyId: (0, assert_company_id_1.assertCompanyId)(user),
            userId: user.id,
            entityType: 'RFQ',
            entityId: id,
            action: 'SEND_RFQ',
            result: 'success',
            detail: { recipients: emailDelivery.sent, resend: true },
        }));
        return { ...existing, emailDelivery };
    }
    async close(user, id) {
        await this.get(user, id);
        return this.prisma.rfqHeader.update({
            where: { id },
            data: {
                notes: `[Closed ${new Date().toISOString()}]`,
                updatedById: user.id,
            },
        });
    }
    async deletionImpact(user, id) {
        await this.get(user, id);
        const [quotationCount, contractCount] = await Promise.all([
            this.prisma.supplierQuotationHeader.count({ where: { rfqId: id } }),
            this.prisma.contractHeader.count({ where: { rfqId: id } }),
        ]);
        const canDelete = quotationCount === 0 && contractCount === 0;
        let reason = null;
        if (quotationCount > 0) {
            reason = `${quotationCount} supplier quotation(s) must be removed first.`;
        }
        else if (contractCount > 0) {
            reason = `${contractCount} contract(s) are linked to this RFQ.`;
        }
        return { canDelete, quotationCount, contractCount, reason };
    }
    async remove(user, id) {
        const existing = await this.get(user, id);
        const impact = await this.deletionImpact(user, id);
        if (!impact.canDelete) {
            throw new common_1.BadRequestException(impact.reason ?? 'This RFQ cannot be deleted because related records exist.');
        }
        await this.prisma.$transaction([
            this.prisma.rfqSupplier.deleteMany({ where: { rfqId: id } }),
            this.prisma.rfqItem.deleteMany({ where: { rfqHeaderId: id } }),
            this.prisma.rfqHeader.delete({ where: { id } }),
        ]);
        return { id, rfqNumber: existing.rfqNumber, deleted: true };
    }
    async fulfillment(user, id) {
        const rfq = await this.get(user, id);
        const fulfillment = await this.buildFulfillmentSummary(rfq.id, rfq.items);
        return { rfqId: rfq.id, fulfillment };
    }
    async assertCanCreatePoFromRfq(args) {
        const db = args.tx ?? this.prisma;
        if (args.tx) {
            await args.tx.$executeRaw `SELECT id FROM rfq_header WHERE id = ${args.rfqId}::uuid FOR UPDATE`;
            await args.tx.$executeRaw `SELECT id FROM rfq_items WHERE rfq_header_id = ${args.rfqId}::uuid FOR UPDATE`;
        }
        const rfq = await db.rfqHeader.findFirst({
            where: { id: args.rfqId, shopId: args.shopId },
            select: { id: true, shopId: true, status: true },
        });
        if (!rfq) {
            throw new common_1.NotFoundException('RFQ not found for the selected plant');
        }
        (0, assert_action_1.assertRfqAction)(rfq.status, document_actions_1.RfqAction.CREATE_PO);
        if (args.supplierName?.trim()) {
            const expectedSupplier = args.supplierName.trim().toLowerCase();
            const rfqSuppliers = await db.rfqSupplier.findMany({
                where: { rfqId: args.rfqId },
                select: { supplier: { select: { supplierName: true } } },
            });
            if (rfqSuppliers.length > 0 &&
                !rfqSuppliers.some((row) => row.supplier?.supplierName?.trim().toLowerCase() === expectedSupplier)) {
                throw new common_1.BadRequestException('Purchase order supplier must match one of the RFQ suppliers');
            }
        }
        const fulfillment = await this.buildFulfillmentSummary(args.rfqId, undefined, {
            tx: args.tx,
            excludePoHeaderId: args.excludePoHeaderId,
        });
        if (fulfillment.posCreated >= fulfillment.maxPos) {
            throw new common_1.BadRequestException('All RFQ lines are already allocated to purchase orders');
        }
        const linesMap = new Map(fulfillment.lines.map((l) => [l.rfqItemId, l]));
        const requestedByItem = new Map();
        for (const line of args.items) {
            const key = line.rfqItemId?.trim();
            if (!key) {
                throw new common_1.BadRequestException('Invalid rfqItemId on purchase order line');
            }
            if (line.orderQty <= 0) {
                throw new common_1.BadRequestException('Order quantity must be greater than zero');
            }
            requestedByItem.set(key, (requestedByItem.get(key) ?? 0) + line.orderQty);
        }
        for (const [rfqItemId, orderQty] of requestedByItem.entries()) {
            const ref = linesMap.get(rfqItemId);
            if (!ref) {
                throw new common_1.BadRequestException('Invalid rfqItemId on purchase order line');
            }
            if (orderQty > ref.remainingQty) {
                throw new common_1.BadRequestException(`Requested quantity exceeds remaining RFQ quantity for item ${ref.productId ?? ref.rfqItemId}`);
            }
        }
        if (requestedByItem.size === 0) {
            throw new common_1.BadRequestException('No remaining RFQ quantity available for purchase order');
        }
    }
    async buildFulfillmentSummary(rfqId, items, options) {
        const db = options?.tx ?? this.prisma;
        const rfqItems = items ??
            (await db.rfqItem.findMany({
                where: { rfqHeaderId: rfqId },
                select: { id: true, productId: true, quantity: true },
            }));
        const rfqItemIds = rfqItems.map((i) => i.id);
        const poLines = rfqItemIds.length === 0
            ? []
            : await db.purchaseOrderItem.findMany({
                where: {
                    rfqItemId: { in: rfqItemIds },
                    header: {
                        rfqId,
                        status: { not: client_1.PurchaseOrderStatus.CANCELLED },
                        ...(options?.excludePoHeaderId ? { id: { not: options.excludePoHeaderId } } : {}),
                    },
                },
                select: { rfqItemId: true, orderQty: true },
            });
        const orderedByItem = new Map();
        for (const line of poLines) {
            const key = line.rfqItemId;
            if (!key)
                continue;
            const current = orderedByItem.get(key) ?? 0;
            orderedByItem.set(key, current + Number(line.orderQty));
        }
        const lines = rfqItems.map((item) => {
            const orderedQty = orderedByItem.get(item.id) ?? 0;
            const rfqQty = Number(item.quantity);
            const remainingQty = Math.max(0, rfqQty - orderedQty);
            return {
                rfqItemId: item.id,
                productId: item.productId,
                rfqQty,
                orderedQty,
                remainingQty,
            };
        });
        const totalLines = lines.length;
        const linesFullyOrdered = lines.filter((l) => l.remainingQty === 0).length;
        const linesRemaining = totalLines - linesFullyOrdered;
        const maxPos = totalLines;
        const posCreated = await db.purchaseOrderHeader.count({
            where: {
                rfqId,
                status: { not: client_1.PurchaseOrderStatus.CANCELLED },
                ...(options?.excludePoHeaderId ? { id: { not: options.excludePoHeaderId } } : {}),
            },
        });
        const posRemaining = Math.max(0, maxPos - posCreated);
        return {
            totalLines,
            linesFullyOrdered,
            linesRemaining,
            maxPos,
            posCreated,
            posRemaining,
            lines,
        };
    }
};
exports.RfqsService = RfqsService;
exports.RfqsService = RfqsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService,
        mail_service_1.MailService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        audit_service_1.AuditService])
], RfqsService);
//# sourceMappingURL=rfqs.service.js.map