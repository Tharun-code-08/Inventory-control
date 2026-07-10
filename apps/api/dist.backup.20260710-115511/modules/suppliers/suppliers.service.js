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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const duplicate_conflict_1 = require("../../common/errors/duplicate-conflict");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_1 = require("../../common/utils/pagination");
const shop_scope_1 = require("../../common/utils/shop-scope");
const SUPPLIER_DELETE_TOKEN_TYP = 'supplier-delete-confirm';
let SuppliersService = class SuppliersService {
    prisma;
    mail;
    jwt;
    config;
    constructor(prisma, mail, jwt, config) {
        this.prisma = prisma;
        this.mail = mail;
        this.jwt = jwt;
        this.config = config;
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        const search = query.search?.trim();
        const where = {
            deletedAt: null,
            ...(0, shop_scope_1.supplierListWhere)(user),
            ...(search
                ? {
                    OR: [
                        { supplierName: { contains: search, mode: 'insensitive' } },
                        { supplierCode: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
        };
        const rows = await this.prisma.supplier.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                supplierCode: true,
                supplierName: true,
                companyId: true,
                taxId: true,
                vatNumber: true,
                rating: true,
                categories: true,
                contactPerson: true,
                email: true,
                phone: true,
                street: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                paymentTerms: true,
                bankName: true,
                accountNumber: true,
                routingNumber: true,
                iban: true,
                isActive: true,
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, dto) {
        const companyId = (0, shop_scope_1.companyIdForUser)(user);
        if (!companyId) {
            throw new common_1.BadRequestException('Organisation context is required to create a supplier');
        }
        if (dto.companyId && dto.companyId !== companyId) {
            (0, shop_scope_1.assertCompanyScope)(user, dto.companyId);
        }
        const count = await this.prisma.supplier.count({ where: { companyId } });
        const code = dto.supplierCode?.trim() || `SUP-${String(count + 1).padStart(4, '0')}`;
        const existingByCode = await this.prisma.supplier.findFirst({
            where: { supplierCode: code },
            select: {
                id: true,
                supplierCode: true,
                supplierName: true,
                deletedAt: true,
                isActive: true,
            },
        });
        if (existingByCode) {
            (0, duplicate_conflict_1.throwDuplicateRecordConflict)(`Supplier "${existingByCode.supplierName}" (${existingByCode.supplierCode}) already exists.`, {
                recordId: existingByCode.id,
                recordCode: existingByCode.supplierCode,
                recordName: existingByCode.supplierName,
                entity: 'Supplier',
                listPath: '/suppliers',
                isArchived: existingByCode.deletedAt != null || !existingByCode.isActive,
            }, {
                userId: user.id,
                userEmail: user.email,
                shopId: user.shopId,
                companyId: user.companyId,
            });
        }
        try {
            return await this.prisma.supplier.create({
                data: {
                    supplierCode: code,
                    supplierName: dto.supplierName,
                    companyId,
                    taxId: dto.taxId ?? null,
                    vatNumber: dto.vatNumber ?? null,
                    rating: dto.rating ?? 3,
                    categories: Array.isArray(dto.categories) ? dto.categories : [],
                    contactPerson: dto.contactPerson ?? null,
                    email: dto.email?.toLowerCase?.() ?? null,
                    phone: dto.phone ?? null,
                    street: dto.street ?? null,
                    city: dto.city ?? null,
                    state: dto.state ?? null,
                    postalCode: dto.postalCode ?? null,
                    country: dto.country ?? null,
                    paymentTerms: dto.paymentTerms ?? null,
                    bankName: dto.bankName ?? null,
                    accountNumber: dto.accountNumber ?? null,
                    routingNumber: dto.routingNumber ?? null,
                    iban: dto.iban ?? null,
                    isActive: dto.isActive ?? true,
                    createdById: user.id,
                },
                include: { company: true },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const retry = await this.prisma.supplier.findFirst({
                    where: { supplierCode: code },
                    select: {
                        id: true,
                        supplierCode: true,
                        supplierName: true,
                        deletedAt: true,
                        isActive: true,
                    },
                });
                if (retry) {
                    (0, duplicate_conflict_1.throwDuplicateRecordConflict)(`Supplier "${retry.supplierName}" (${retry.supplierCode}) already exists.`, {
                        recordId: retry.id,
                        recordCode: retry.supplierCode,
                        recordName: retry.supplierName,
                        entity: 'Supplier',
                        listPath: '/suppliers',
                        isArchived: retry.deletedAt != null || !retry.isActive,
                    }, {
                        userId: user.id,
                        userEmail: user.email,
                        shopId: user.shopId,
                        companyId: user.companyId,
                    });
                }
            }
            throw error;
        }
    }
    async get(user, id) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id }, include: { company: true } });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        (0, shop_scope_1.assertSupplierInTenant)(user, supplier.companyId);
        return supplier;
    }
    async update(user, id, dto) {
        await this.get(user, id);
        return this.prisma.supplier.update({
            where: { id },
            data: {
                supplierCode: dto.supplierCode,
                supplierName: dto.supplierName,
                companyId: dto.companyId,
                taxId: dto.taxId,
                vatNumber: dto.vatNumber,
                rating: dto.rating,
                categories: dto.categories,
                contactPerson: dto.contactPerson,
                email: dto.email?.toLowerCase?.(),
                phone: dto.phone,
                street: dto.street,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country,
                paymentTerms: dto.paymentTerms,
                bankName: dto.bankName,
                accountNumber: dto.accountNumber,
                routingNumber: dto.routingNumber,
                iban: dto.iban,
                isActive: dto.isActive,
                updatedById: user.id,
            },
            include: { company: true },
        });
    }
    async getDeletionImpact(user, id) {
        const supplier = await this.get(user, id);
        if (supplier.deletedAt) {
            throw new common_1.BadRequestException('Supplier is already deleted');
        }
        const [rfqCount, quotationCount, contractCount, purchaseOrderCount, rfqLinks] = await Promise.all([
            this.prisma.rfqSupplier.count({ where: { supplierId: id } }),
            this.prisma.supplierQuotationHeader.count({ where: { supplierId: id } }),
            this.prisma.contractHeader.count({ where: { supplierId: id } }),
            this.prisma.purchaseOrderHeader.count({
                where: { supplier: supplier.supplierName },
            }),
            this.prisma.rfqSupplier.findMany({
                where: { supplierId: id },
                include: {
                    rfq: { select: { id: true, rfqNumber: true, title: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        return {
            supplier: {
                id: supplier.id,
                supplierName: supplier.supplierName,
                supplierCode: supplier.supplierCode,
            },
            counts: {
                rfqInvitations: rfqCount,
                quotations: quotationCount,
                contracts: contractCount,
                purchaseOrders: purchaseOrderCount,
            },
            linkedRfqs: rfqLinks.map((link) => ({
                id: link.rfq.id,
                rfqNumber: link.rfq.rfqNumber,
                title: link.rfq.title,
                status: link.rfq.status,
            })),
            note: 'Deleting removes the supplier from active lists. RFQs, POs, and other documents keep their historical supplier name.',
        };
    }
    adminNotificationEmail() {
        const configured = this.config.get('ADMIN_NOTIFICATION_EMAIL')?.trim();
        if (configured)
            return configured;
        return 'office@softdigitconsulting.com';
    }
    createDeletionToken(supplierId, requestedBy) {
        return this.jwt.sign({
            typ: SUPPLIER_DELETE_TOKEN_TYP,
            sub: supplierId,
            requestedBy: requestedBy.id,
            requestedByName: requestedBy.email,
        }, { expiresIn: '48h' });
    }
    verifyDeletionToken(token) {
        if (!token?.trim()) {
            throw new common_1.BadRequestException('Confirmation token is required');
        }
        try {
            const payload = this.jwt.verify(token);
            if (payload.typ !== SUPPLIER_DELETE_TOKEN_TYP || !payload.sub) {
                throw new common_1.BadRequestException('Invalid confirmation token');
            }
            return { supplierId: payload.sub };
        }
        catch {
            throw new common_1.BadRequestException('Confirmation link is invalid or expired');
        }
    }
    async requestDeletion(user, id) {
        const impact = await this.getDeletionImpact(user, id);
        if (!this.mail.isConfigured()) {
            throw new common_1.BadRequestException('Email is not configured. Cannot send deletion confirmation to admin.');
        }
        const adminEmail = this.adminNotificationEmail();
        const token = this.createDeletionToken(id, user);
        await this.mail.sendSupplierDeletionConfirm({
            adminEmail,
            supplierName: impact.supplier.supplierName,
            supplierCode: impact.supplier.supplierCode,
            requestedByName: user.email,
            confirmToken: token,
            rfqCount: impact.counts.rfqInvitations,
            quotationCount: impact.counts.quotations,
            contractCount: impact.counts.contracts,
            purchaseOrderCount: impact.counts.purchaseOrders,
        });
        return {
            pending: true,
            adminEmail,
            impact,
            message: `Confirmation email sent to ${adminEmail}. The supplier is not deleted until the link is opened.`,
        };
    }
    async confirmDeletion(token) {
        const { supplierId } = this.verifyDeletionToken(token);
        const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) {
            throw new common_1.NotFoundException('Supplier not found');
        }
        if (supplier.deletedAt) {
            return {
                success: true,
                alreadyDeleted: true,
                supplierName: supplier.supplierName,
                supplierCode: supplier.supplierCode,
                message: 'Supplier was already deleted.',
            };
        }
        await this.prisma.supplier.update({
            where: { id: supplierId },
            data: { isActive: false, deletedAt: new Date() },
        });
        return {
            success: true,
            alreadyDeleted: false,
            supplierName: supplier.supplierName,
            supplierCode: supplier.supplierCode,
            message: 'Supplier deleted successfully.',
        };
    }
    async remove(user, id) {
        return this.requestDeletion(user, id);
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        jwt_1.JwtService,
        config_1.ConfigService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map