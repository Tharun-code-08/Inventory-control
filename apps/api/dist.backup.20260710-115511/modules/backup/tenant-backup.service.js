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
exports.TenantBackupService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const zlib_1 = require("zlib");
const prisma_service_1 = require("../../prisma/prisma.service");
const backup_constants_1 = require("./backup.constants");
function jsonSafe(value) {
    return JSON.parse(JSON.stringify(value, (_key, v) => {
        if (typeof v === 'bigint')
            return v.toString();
        if (v instanceof client_1.Prisma.Decimal)
            return v.toString();
        if (v instanceof Date)
            return v.toISOString();
        return v;
    }));
}
let TenantBackupService = class TenantBackupService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    serializeBackup(payload) {
        return (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(payload), 'utf8'));
    }
    parseBackupBuffer(buffer) {
        const raw = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
            ? (0, zlib_1.gunzipSync)(buffer)
            : buffer;
        const payload = JSON.parse(raw.toString('utf8'));
        if (!payload?.backupSchemaVersion) {
            throw new common_1.BadRequestException('Invalid backup file format');
        }
        return payload;
    }
    async exportCompany(companyId) {
        const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
        const shops = await this.prisma.shop.findMany({ where: { companyId } });
        const shopIds = shops.map((s) => s.id);
        const storageLocations = shopIds.length
            ? await this.prisma.storageLocation.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const suppliers = await this.prisma.supplier.findMany({ where: { companyId } });
        const customers = shopIds.length
            ? await this.prisma.customer.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const productPlants = shopIds.length
            ? await this.prisma.productPlant.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const productIds = [...new Set(productPlants.map((p) => p.productId))];
        const products = productIds.length
            ? await this.prisma.product.findMany({ where: { id: { in: productIds } } })
            : [];
        const productSpecifications = productIds.length
            ? await this.prisma.productSpecification.findMany({ where: { productId: { in: productIds } } })
            : [];
        const stockSummaries = shopIds.length
            ? await this.prisma.stockSummary.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const stockLedgers = shopIds.length
            ? await this.prisma.stockLedger.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const purchaseOrders = shopIds.length
            ? await this.prisma.purchaseOrderHeader.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const purchaseOrderItems = purchaseOrders.length
            ? await this.prisma.purchaseOrderItem.findMany({
                where: { poHeaderId: { in: purchaseOrders.map((p) => p.id) } },
            })
            : [];
        const goodsReceipts = shopIds.length
            ? await this.prisma.goodsReceiptHeader.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const goodsReceiptItems = goodsReceipts.length
            ? await this.prisma.goodsReceiptItem.findMany({
                where: { grHeaderId: { in: goodsReceipts.map((g) => g.id) } },
            })
            : [];
        const goodsIssues = shopIds.length
            ? await this.prisma.goodsIssueHeader.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const goodsIssueItems = goodsIssues.length
            ? await this.prisma.goodsIssueItem.findMany({
                where: { giHeaderId: { in: goodsIssues.map((g) => g.id) } },
            })
            : [];
        const salesOrders = shopIds.length
            ? await this.prisma.salesOrderHeader.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const salesOrderItems = salesOrders.length
            ? await this.prisma.salesOrderItem.findMany({
                where: { soHeaderId: { in: salesOrders.map((s) => s.id) } },
            })
            : [];
        const invoices = shopIds.length
            ? await this.prisma.invoiceHeader.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        const paymentReceipts = shopIds.length
            ? await this.prisma.paymentReceipt.findMany({ where: { shopId: { in: shopIds } } })
            : [];
        return jsonSafe({
            backupSchemaVersion: backup_constants_1.BACKUP_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            company,
            shops,
            storageLocations,
            suppliers,
            customers,
            products,
            productPlants,
            productSpecifications,
            stockSummaries,
            stockLedgers,
            purchaseOrders,
            purchaseOrderItems,
            goodsReceipts,
            goodsReceiptItems,
            goodsIssues,
            goodsIssueItems,
            salesOrders,
            salesOrderItems,
            invoices,
            paymentReceipts,
        });
    }
    buildDryRunReport(payload, targetCompany) {
        const warnings = [];
        if (payload.backupSchemaVersion !== backup_constants_1.BACKUP_SCHEMA_VERSION) {
            warnings.push(`Backup schema v${payload.backupSchemaVersion} differs from current v${backup_constants_1.BACKUP_SCHEMA_VERSION}`);
        }
        const sourceCompanyCode = payload.company?.companyCode ?? null;
        if (sourceCompanyCode && sourceCompanyCode !== targetCompany.companyCode) {
            warnings.push(`Backup source company ${sourceCompanyCode} differs from target ${targetCompany.companyCode}`);
        }
        const counts = {
            shops: payload.shops?.length ?? 0,
            products: payload.products?.length ?? 0,
            purchaseOrders: payload.purchaseOrders?.length ?? 0,
            goodsReceipts: payload.goodsReceipts?.length ?? 0,
            goodsIssues: payload.goodsIssues?.length ?? 0,
            salesOrders: payload.salesOrders?.length ?? 0,
            invoices: payload.invoices?.length ?? 0,
            paymentReceipts: payload.paymentReceipts?.length ?? 0,
        };
        return {
            schemaVersion: payload.backupSchemaVersion,
            exportedAt: payload.exportedAt ?? null,
            sourceCompanyCode,
            targetCompanyCode: targetCompany.companyCode,
            counts,
            warnings,
            canApply: warnings.length === 0 || warnings.every((w) => !w.includes('schema')),
        };
    }
    async applyTenantReplace(companyId, payload, userId) {
        let processed = 0;
        await this.prisma.$transaction(async (tx) => {
            processed = await this.applyTenantReplaceTx(tx, companyId, payload, userId);
        }, { timeout: 120_000 });
        return { recordsProcessed: processed };
    }
    async applyTenantReplaceTx(tx, companyId, payload, userId) {
        const shops = await tx.shop.findMany({ where: { companyId }, select: { id: true } });
        const shopIds = shops.map((s) => s.id);
        if (shopIds.length) {
            await tx.paymentReceipt.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.invoiceHeader.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.salesOrderItem.deleteMany({ where: { header: { shopId: { in: shopIds } } } });
            await tx.salesOrderHeader.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.goodsIssueItem.deleteMany({ where: { header: { shopId: { in: shopIds } } } });
            await tx.goodsIssueHeader.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.goodsReceiptItem.deleteMany({ where: { header: { shopId: { in: shopIds } } } });
            await tx.goodsReceiptHeader.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.purchaseOrderItem.deleteMany({ where: { header: { shopId: { in: shopIds } } } });
            await tx.purchaseOrderHeader.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.stockLedger.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.stockSummary.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.customer.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.storageLocation.deleteMany({ where: { shopId: { in: shopIds } } });
            await tx.productPlant.deleteMany({ where: { shopId: { in: shopIds } } });
        }
        await tx.supplier.deleteMany({ where: { companyId } });
        const shopIdMap = new Map();
        for (const row of payload.shops ?? []) {
            const shopNumber = String(row.shopNumber ?? '');
            const existing = await tx.shop.findFirst({ where: { companyId, shopNumber } });
            const data = {
                shopNumber,
                shopName: String(row.shopName ?? shopNumber),
                taxId: row.taxId ?? null,
                address: String(row.address ?? ''),
                contactPerson: String(row.contactPerson ?? ''),
                mobile: String(row.mobile ?? ''),
                email: String(row.email ?? ''),
                companyId,
                isActive: Boolean(row.isActive ?? true),
                costingMethod: row.costingMethod ?? 'AVERAGE',
                functionalCurrency: String(row.functionalCurrency ?? 'USD'),
                updatedById: userId,
            };
            const saved = existing
                ? await tx.shop.update({ where: { id: existing.id }, data })
                : await tx.shop.create({ data: { ...data, createdById: userId } });
            shopIdMap.set(String(row.id), saved.id);
        }
        const storageLocationIdMap = new Map();
        for (const row of payload.storageLocations ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            if (!shopId)
                continue;
            const code = String(row.code ?? 'DEFAULT');
            const saved = await tx.storageLocation.upsert({
                where: { shopId_code: { shopId, code } },
                create: {
                    shopId,
                    code,
                    name: String(row.name ?? code),
                    description: row.description ?? null,
                    isActive: Boolean(row.isActive ?? true),
                    createdById: userId,
                },
                update: {
                    name: String(row.name ?? code),
                    description: row.description ?? null,
                    isActive: Boolean(row.isActive ?? true),
                    updatedById: userId,
                },
            });
            storageLocationIdMap.set(String(row.id), saved.id);
        }
        const productIdMap = new Map();
        for (const row of payload.products ?? []) {
            const productCode = String(row.productCode ?? '');
            const existing = await tx.product.findUnique({ where: { productCode } });
            const data = {
                productCode,
                description: String(row.description ?? productCode),
                uom: String(row.uom ?? 'pcs'),
                category: String(row.category ?? 'General'),
                hsnCode: row.hsnCode ?? null,
                materialGroup: row.materialGroup ?? null,
                drawingReference: row.drawingReference ?? null,
                brand: row.brand ?? null,
                taxPreference: row.taxPreference ?? 'TAXABLE',
                purchasePrice: new client_1.Prisma.Decimal(String(row.purchasePrice ?? 0)),
                sellingPrice: new client_1.Prisma.Decimal(String(row.sellingPrice ?? 0)),
                isActive: Boolean(row.isActive ?? true),
                updatedById: userId,
            };
            const saved = existing
                ? await tx.product.update({ where: { id: existing.id }, data })
                : await tx.product.create({ data: { ...data, createdById: userId } });
            productIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.productSpecifications ?? []) {
            const productId = productIdMap.get(String(row.productId));
            if (!productId)
                continue;
            await tx.productSpecification.create({
                data: {
                    productId,
                    label: String(row.label ?? 'Spec'),
                    value: String(row.value ?? ''),
                    sortOrder: Number(row.sortOrder ?? 0),
                },
            });
        }
        for (const row of payload.suppliers ?? []) {
            await tx.supplier.create({
                data: {
                    supplierCode: String(row.supplierCode ?? `SUP-${Date.now()}`),
                    supplierName: String(row.supplierName ?? 'Supplier'),
                    companyId,
                    taxId: row.taxId ?? null,
                    vatNumber: row.vatNumber ?? null,
                    rating: Number(row.rating ?? 0),
                    categories: row.categories ?? [],
                    contactPerson: row.contactPerson ?? null,
                    email: row.email ?? null,
                    phone: row.phone ?? null,
                    street: row.street ?? null,
                    city: row.city ?? null,
                    state: row.state ?? null,
                    postalCode: row.postalCode ?? null,
                    country: row.country ?? null,
                    paymentTerms: row.paymentTerms ?? null,
                    bankName: row.bankName ?? null,
                    accountNumber: row.accountNumber ?? null,
                    routingNumber: row.routingNumber ?? null,
                    iban: row.iban ?? null,
                    isActive: Boolean(row.isActive ?? true),
                    createdById: userId,
                },
            });
        }
        const customerIdMap = new Map();
        for (const row of payload.customers ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            if (!shopId)
                continue;
            const saved = await tx.customer.create({
                data: {
                    shopId,
                    customerCode: String(row.customerCode ?? `C-${Date.now()}`),
                    customerName: String(row.customerName ?? 'Customer'),
                    email: row.email ?? null,
                    phone: row.phone ?? null,
                    taxId: row.taxId ?? null,
                    street: row.street ?? null,
                    city: row.city ?? null,
                    state: row.state ?? null,
                    postalCode: row.postalCode ?? null,
                    country: row.country ?? null,
                    isActive: Boolean(row.isActive ?? true),
                    createdById: userId,
                },
            });
            customerIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.productPlants ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const productId = productIdMap.get(String(row.productId));
            if (!shopId || !productId)
                continue;
            const storageLocationId = row.storageLocationId
                ? storageLocationIdMap.get(String(row.storageLocationId)) ?? null
                : null;
            await tx.productPlant.upsert({
                where: { productId_shopId: { productId, shopId } },
                create: {
                    productId,
                    shopId,
                    storageLocationId,
                    openingStock: new client_1.Prisma.Decimal(String(row.openingStock ?? 0)),
                    minStockLevel: new client_1.Prisma.Decimal(String(row.minStockLevel ?? row.reorderLevel ?? 0)),
                    maxStockLevel: row.maxStockLevel != null || row.maxStock != null
                        ? new client_1.Prisma.Decimal(String(row.maxStockLevel ?? row.maxStock ?? 0))
                        : null,
                    reorderQty: row.reorderQty != null ? new client_1.Prisma.Decimal(String(row.reorderQty)) : null,
                    isActive: Boolean(row.isActive ?? true),
                    createdById: userId,
                },
                update: {
                    openingStock: new client_1.Prisma.Decimal(String(row.openingStock ?? 0)),
                    minStockLevel: new client_1.Prisma.Decimal(String(row.minStockLevel ?? row.reorderLevel ?? 0)),
                    maxStockLevel: row.maxStockLevel != null || row.maxStock != null
                        ? new client_1.Prisma.Decimal(String(row.maxStockLevel ?? row.maxStock ?? 0))
                        : null,
                    reorderQty: row.reorderQty != null ? new client_1.Prisma.Decimal(String(row.reorderQty)) : null,
                    storageLocationId,
                    isActive: Boolean(row.isActive ?? true),
                    updatedById: userId,
                },
            });
        }
        for (const row of payload.stockSummaries ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const productId = productIdMap.get(String(row.productId));
            if (!shopId || !productId)
                continue;
            await tx.stockSummary.upsert({
                where: { shopId_productId: { shopId, productId } },
                create: {
                    shopId,
                    productId,
                    currentStock: new client_1.Prisma.Decimal(String(row.currentStock ?? 0)),
                    avgCost: new client_1.Prisma.Decimal(String(row.avgCost ?? 0)),
                    lastMovementAt: new Date(String(row.lastMovementAt ?? new Date().toISOString())),
                    createdById: userId,
                },
                update: {
                    currentStock: new client_1.Prisma.Decimal(String(row.currentStock ?? 0)),
                    avgCost: new client_1.Prisma.Decimal(String(row.avgCost ?? 0)),
                    lastMovementAt: new Date(String(row.lastMovementAt ?? new Date().toISOString())),
                    updatedById: userId,
                },
            });
        }
        const poIdMap = new Map();
        for (const row of payload.purchaseOrders ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            if (!shopId)
                continue;
            const saved = await tx.purchaseOrderHeader.create({
                data: {
                    poNumber: String(row.poNumber ?? `PO-${Date.now()}`),
                    poDate: new Date(String(row.poDate ?? new Date().toISOString())),
                    shopId,
                    supplier: String(row.supplier ?? row.supplierName ?? 'Supplier'),
                    status: row.status ?? 'DRAFT',
                    remarks: row.remarks ?? null,
                    currency: String(row.currency ?? 'USD'),
                    discountAmount: new client_1.Prisma.Decimal(String(row.discountAmount ?? 0)),
                    taxAmount: new client_1.Prisma.Decimal(String(row.taxAmount ?? 0)),
                    totalValue: new client_1.Prisma.Decimal(String(row.totalValue ?? 0)),
                    createdById: userId,
                },
            });
            poIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.purchaseOrderItems ?? []) {
            const poHeaderId = poIdMap.get(String(row.poHeaderId));
            const productId = productIdMap.get(String(row.productId));
            if (!poHeaderId || !productId)
                continue;
            await tx.purchaseOrderItem.create({
                data: {
                    poHeaderId,
                    productId,
                    currentStock: new client_1.Prisma.Decimal(String(row.currentStock ?? 0)),
                    minStock: new client_1.Prisma.Decimal(String(row.minStock ?? 0)),
                    suggestedQty: new client_1.Prisma.Decimal(String(row.suggestedQty ?? row.orderQty ?? 0)),
                    orderQty: new client_1.Prisma.Decimal(String(row.orderQty ?? 0)),
                    rate: new client_1.Prisma.Decimal(String(row.rate ?? row.unitRate ?? 0)),
                    discountAmount: new client_1.Prisma.Decimal(String(row.discountAmount ?? 0)),
                    taxRate: new client_1.Prisma.Decimal(String(row.taxRate ?? row.taxPercent ?? 0)),
                    taxAmount: new client_1.Prisma.Decimal(String(row.taxAmount ?? 0)),
                    lineValue: new client_1.Prisma.Decimal(String(row.lineValue ?? 0)),
                    createdById: userId,
                },
            });
        }
        for (const row of payload.stockLedgers ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const productId = productIdMap.get(String(row.productId));
            if (!shopId || !productId)
                continue;
            await tx.stockLedger.create({
                data: {
                    transactionType: row.transactionType ?? 'ADJUSTMENT',
                    transactionRef: String(row.transactionRef ?? 'RESTORE'),
                    transactionDate: new Date(String(row.transactionDate ?? new Date().toISOString())),
                    shopId,
                    productId,
                    inQty: new client_1.Prisma.Decimal(String(row.inQty ?? 0)),
                    outQty: new client_1.Prisma.Decimal(String(row.outQty ?? 0)),
                    balanceQty: new client_1.Prisma.Decimal(String(row.balanceQty ?? 0)),
                    unitRate: row.unitRate != null ? new client_1.Prisma.Decimal(String(row.unitRate)) : null,
                    value: row.value != null ? new client_1.Prisma.Decimal(String(row.value)) : null,
                    remarks: row.remarks ?? null,
                    idempotencyKey: row.idempotencyKey ?? null,
                    createdById: userId,
                },
            });
        }
        const grIdMap = new Map();
        for (const row of payload.goodsReceipts ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            if (!shopId)
                continue;
            const purchaseOrderId = row.purchaseOrderId
                ? poIdMap.get(String(row.purchaseOrderId)) ?? null
                : null;
            const saved = await tx.goodsReceiptHeader.create({
                data: {
                    grNumber: String(row.grNumber ?? `GR-${Date.now()}`),
                    grDate: new Date(String(row.grDate ?? new Date().toISOString())),
                    shopId,
                    supplierName: String(row.supplierName ?? 'Supplier'),
                    purchaseOrderId,
                    supplierRef: row.supplierRef ?? null,
                    remarks: row.remarks ?? null,
                    status: row.status ?? 'DRAFT',
                    postedAt: row.postedAt ? new Date(String(row.postedAt)) : null,
                    totalValue: row.totalValue != null ? new client_1.Prisma.Decimal(String(row.totalValue)) : null,
                    createdById: userId,
                },
            });
            grIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.goodsReceiptItems ?? []) {
            const grHeaderId = grIdMap.get(String(row.grHeaderId));
            const productId = productIdMap.get(String(row.productId));
            if (!grHeaderId || !productId)
                continue;
            await tx.goodsReceiptItem.create({
                data: {
                    grHeaderId,
                    productId,
                    quantity: new client_1.Prisma.Decimal(String(row.quantity ?? 0)),
                    uom: String(row.uom ?? 'pcs'),
                    purchaseRate: new client_1.Prisma.Decimal(String(row.purchaseRate ?? 0)),
                    lineValue: new client_1.Prisma.Decimal(String(row.lineValue ?? 0)),
                    batchNumber: row.batchNumber ?? null,
                    serialNumber: row.serialNumber ?? null,
                    createdById: userId,
                },
            });
        }
        const giIdMap = new Map();
        for (const row of payload.goodsIssues ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            if (!shopId)
                continue;
            const saved = await tx.goodsIssueHeader.create({
                data: {
                    giNumber: String(row.giNumber ?? `GI-${Date.now()}`),
                    giDate: new Date(String(row.giDate ?? new Date().toISOString())),
                    shopId,
                    issueType: String(row.issueType ?? row.issueReason ?? 'Others'),
                    issueReason: String(row.issueReason ?? row.issueType ?? 'RESTORE'),
                    otherReason: row.otherReason ?? null,
                    remarks: row.remarks ?? null,
                    status: row.status ?? 'DRAFT',
                    postedAt: row.postedAt ? new Date(String(row.postedAt)) : null,
                    createdById: userId,
                },
            });
            giIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.goodsIssueItems ?? []) {
            const giHeaderId = giIdMap.get(String(row.giHeaderId));
            const productId = productIdMap.get(String(row.productId));
            if (!giHeaderId || !productId)
                continue;
            await tx.goodsIssueItem.create({
                data: {
                    giHeaderId,
                    productId,
                    quantity: new client_1.Prisma.Decimal(String(row.quantity ?? 0)),
                    uom: String(row.uom ?? 'pcs'),
                    availableStockSnapshot: new client_1.Prisma.Decimal(String(row.availableStockSnapshot ?? row.quantity ?? 0)),
                    createdById: userId,
                },
            });
        }
        const soIdMap = new Map();
        for (const row of payload.salesOrders ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const customerId = customerIdMap.get(String(row.customerId));
            if (!shopId || !customerId)
                continue;
            const saved = await tx.salesOrderHeader.create({
                data: {
                    soNumber: String(row.soNumber ?? `SO-${Date.now()}`),
                    orderDate: new Date(String(row.orderDate ?? new Date().toISOString())),
                    expectedDate: row.expectedDate ? new Date(String(row.expectedDate)) : null,
                    customerId,
                    shopId,
                    status: row.status ?? 'DRAFT',
                    fulfillmentStatus: row.fulfillmentStatus ?? 'NONE',
                    remarks: row.remarks ?? null,
                    currency: String(row.currency ?? 'USD'),
                    fxRateUsed: row.fxRateUsed != null ? new client_1.Prisma.Decimal(String(row.fxRateUsed)) : null,
                    discountAmount: new client_1.Prisma.Decimal(String(row.discountAmount ?? 0)),
                    taxAmount: new client_1.Prisma.Decimal(String(row.taxAmount ?? 0)),
                    totalValue: row.totalValue != null ? new client_1.Prisma.Decimal(String(row.totalValue)) : null,
                    createdById: userId,
                },
            });
            soIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.salesOrderItems ?? []) {
            const soHeaderId = soIdMap.get(String(row.soHeaderId));
            const productId = productIdMap.get(String(row.productId));
            if (!soHeaderId || !productId)
                continue;
            await tx.salesOrderItem.create({
                data: {
                    soHeaderId,
                    productId,
                    quantity: new client_1.Prisma.Decimal(String(row.quantity ?? row.orderQty ?? 0)),
                    shippedQty: new client_1.Prisma.Decimal(String(row.shippedQty ?? row.fulfilledQty ?? 0)),
                    uom: String(row.uom ?? 'pcs'),
                    unitPrice: new client_1.Prisma.Decimal(String(row.unitPrice ?? row.rate ?? 0)),
                    discountAmount: new client_1.Prisma.Decimal(String(row.discountAmount ?? 0)),
                    taxRate: new client_1.Prisma.Decimal(String(row.taxRate ?? 0)),
                    taxAmount: new client_1.Prisma.Decimal(String(row.taxAmount ?? 0)),
                    lineValue: new client_1.Prisma.Decimal(String(row.lineValue ?? 0)),
                    createdById: userId,
                },
            });
        }
        const invoiceIdMap = new Map();
        for (const row of payload.invoices ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const customerId = customerIdMap.get(String(row.customerId));
            if (!shopId || !customerId)
                continue;
            const salesOrderId = row.salesOrderId
                ? soIdMap.get(String(row.salesOrderId)) ?? null
                : null;
            const saved = await tx.invoiceHeader.create({
                data: {
                    invoiceNumber: String(row.invoiceNumber ?? `INV-${Date.now()}`),
                    invoiceDate: new Date(String(row.invoiceDate ?? new Date().toISOString())),
                    salesOrderId,
                    customerId,
                    shopId,
                    status: row.status ?? 'DRAFT',
                    currency: String(row.currency ?? 'USD'),
                    fxRateUsed: row.fxRateUsed != null ? new client_1.Prisma.Decimal(String(row.fxRateUsed)) : null,
                    discountAmount: new client_1.Prisma.Decimal(String(row.discountAmount ?? 0)),
                    taxAmount: new client_1.Prisma.Decimal(String(row.taxAmount ?? 0)),
                    totalValue: new client_1.Prisma.Decimal(String(row.totalValue ?? 0)),
                    paidValue: new client_1.Prisma.Decimal(String(row.paidValue ?? 0)),
                    dueDate: row.dueDate ? new Date(String(row.dueDate)) : null,
                    remarks: row.remarks ?? null,
                    createdById: userId,
                },
            });
            invoiceIdMap.set(String(row.id), saved.id);
        }
        for (const row of payload.paymentReceipts ?? []) {
            const shopId = shopIdMap.get(String(row.shopId));
            const invoiceId = invoiceIdMap.get(String(row.invoiceId));
            if (!shopId || !invoiceId)
                continue;
            await tx.paymentReceipt.create({
                data: {
                    receiptNumber: String(row.receiptNumber ?? `RCPT-${Date.now()}`),
                    receiptDate: new Date(String(row.receiptDate ?? new Date().toISOString())),
                    invoiceId,
                    shopId,
                    amount: new client_1.Prisma.Decimal(String(row.amount ?? 0)),
                    currency: String(row.currency ?? 'USD'),
                    fxRateUsed: row.fxRateUsed != null ? new client_1.Prisma.Decimal(String(row.fxRateUsed)) : null,
                    method: row.method ?? null,
                    reference: row.reference ?? null,
                    remarks: row.remarks ?? null,
                    createdById: userId,
                },
            });
        }
        const processed = (payload.shops?.length ?? 0) +
            (payload.storageLocations?.length ?? 0) +
            (payload.products?.length ?? 0) +
            (payload.productSpecifications?.length ?? 0) +
            (payload.suppliers?.length ?? 0) +
            (payload.customers?.length ?? 0) +
            (payload.productPlants?.length ?? 0) +
            (payload.stockSummaries?.length ?? 0) +
            (payload.stockLedgers?.length ?? 0) +
            (payload.purchaseOrders?.length ?? 0) +
            (payload.purchaseOrderItems?.length ?? 0) +
            (payload.goodsReceipts?.length ?? 0) +
            (payload.goodsReceiptItems?.length ?? 0) +
            (payload.goodsIssues?.length ?? 0) +
            (payload.goodsIssueItems?.length ?? 0) +
            (payload.salesOrders?.length ?? 0) +
            (payload.salesOrderItems?.length ?? 0) +
            (payload.invoices?.length ?? 0) +
            (payload.paymentReceipts?.length ?? 0);
        return processed;
    }
};
exports.TenantBackupService = TenantBackupService;
exports.TenantBackupService = TenantBackupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantBackupService);
//# sourceMappingURL=tenant-backup.service.js.map