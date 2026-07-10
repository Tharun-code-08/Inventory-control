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
exports.GoodsReceiptWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const goods_receipts_service_1 = require("../../../../goods-receipts/goods-receipts.service");
const products_service_1 = require("../../../../products/products.service");
const purchase_orders_service_1 = require("../../../../purchase-orders/purchase-orders.service");
const shops_service_1 = require("../../../../shops/shops.service");
const storage_locations_service_1 = require("../../../../storage-locations/storage-locations.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_GR = 'purchase.create_gr';
const RECEIVE_PO = 'purchase.receive_po';
function money(value) {
    const num = Number(value ?? 0);
    return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}
let GoodsReceiptWriteToolsService = class GoodsReceiptWriteToolsService {
    registry;
    executor;
    tasks;
    products;
    storageLocations;
    shops;
    goodsReceipts;
    purchaseOrders;
    constructor(registry, executor, tasks, products, storageLocations, shops, goodsReceipts, purchaseOrders) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.products = products;
        this.storageLocations = storageLocations;
        this.shops = shops;
        this.goodsReceipts = goodsReceipts;
        this.purchaseOrders = purchaseOrders;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_goods_receipt',
            id: CREATE_GR,
            description: 'Draft a goods receipt (GRN) for the user to approve. This does NOT create the receipt — it creates a ' +
                'pending draft; the user must reply "approve" before anything is created, and even then the receipt is a ' +
                'DRAFT that must be posted in the ERP before stock changes. Each item needs product_id (preferred) or an ' +
                "exact product_query, plus quantity. purchase_rate defaults to the product's purchase price. " +
                'purchase_order_id may link the receipt to a CONFIRMED purchase order (quantities are validated against ' +
                'it). Relay the returned summary to the user verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    supplier_name: { type: 'string', description: 'Supplier name as free text' },
                    shop_id: { type: 'string', description: 'Warehouse/shop id (defaults to the user\'s shop)' },
                    gr_date: { type: 'string', description: 'Receipt date YYYY-MM-DD (defaults to today; must not be in the future)' },
                    purchase_order_id: { type: 'string', description: 'Optional purchase order id to receive against' },
                    storage_location: { type: 'string', description: 'Storage location code or name (defaults to the shop\'s only active location)' },
                    remarks: { type: 'string' },
                    items: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                product_id: { type: 'string' },
                                product_query: { type: 'string', description: 'Product name or code, used when product_id is unknown' },
                                quantity: { type: 'number', exclusiveMinimum: 0 },
                                purchase_rate: { type: 'number', minimum: 0, description: 'Unit cost in ₹' },
                                uom: { type: 'string', description: 'Unit of measure (defaults to the product UoM)' },
                                batch_number: { type: 'string' },
                                expiry_date: { type: 'string', description: 'Expiry date YYYY-MM-DD (required before the GR can be posted)' },
                            },
                            required: ['quantity'],
                        },
                    },
                },
                required: ['supplier_name', 'items'],
            },
            requiredPermission: 'goods_receipt:create',
            featureFlag: 'purchase',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftGoodsReceipt(ctx, input),
        });
        this.registry.register({
            name: 'receive_purchase_order',
            id: RECEIVE_PO,
            description: 'Draft a goods receipt for ALL remaining (not yet received) quantities of an existing purchase order — ' +
                'use when the user says "received PO-00012 in full", "PO-00012 arrived", "receive my last PO". Takes the ' +
                'PO number (e.g. PO-00012) or po_id. This does NOT create the receipt — the user must reply "approve", ' +
                'and even then the receipt is an ERP DRAFT that must be posted before stock changes. For a PARTIAL ' +
                'delivery use create_goods_receipt with explicit items instead. Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    po_number: { type: 'string', description: 'Purchase order number, e.g. PO-00012' },
                    po_id: { type: 'string', description: 'Purchase order id, if known' },
                    gr_date: { type: 'string', description: 'Receipt date YYYY-MM-DD (defaults to today)' },
                    storage_location: { type: 'string', description: "Storage location code or name (defaults to the shop's only active location)" },
                    remarks: { type: 'string' },
                },
            },
            requiredPermission: 'goods_receipt:create',
            featureFlag: 'purchase',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftReceivePo(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_GR,
            run: (user, payload, task, step) => this.goodsReceipts.create(user, {
                ...payload,
                idempotencyKey: `agent-task:${task.id}:${step.order}`,
            }),
            verify: (result) => {
                const gr = result;
                if (!gr?.id || !gr?.grNumber) {
                    throw new Error('GR creation returned an unexpected result shape');
                }
            },
            describe: (result) => {
                const gr = result;
                const total = (gr.items ?? []).reduce((sum, line) => sum + Number(line.lineValue ?? 0), 0);
                return `✅ Goods receipt *${gr.grNumber}* created as a draft (total ${money(total)}). Post it under Goods Receipts in the ERP to update stock.`;
            },
        });
    }
    async draftReceivePo(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Goods receipt drafting is only available in a chat conversation');
        }
        const po = await this.resolvePo(ctx.user, input);
        if ('clarify' in po)
            return po;
        if (po.status !== 'CONFIRMED') {
            return {
                clarify: `PO ${po.poNumber} is ${po.status} — only CONFIRMED purchase orders can be received. Tell the user.`,
            };
        }
        const remainingByProduct = new Map();
        if (po.receiptProgress && po.receiptProgress.length > 0) {
            for (const row of po.receiptProgress) {
                if (Number(row.remainingQty) > 0)
                    remainingByProduct.set(row.productId, Number(row.remainingQty));
            }
        }
        else {
            for (const item of po.items)
                remainingByProduct.set(item.productId, Number(item.orderQty));
        }
        if (remainingByProduct.size === 0) {
            return { clarify: `PO ${po.poNumber} is already fully received — nothing left to receive. Tell the user.` };
        }
        const grDate = this.resolveGrDate(input.gr_date);
        const location = await this.resolveStorageLocation(ctx.user, po.shopId, input.storage_location);
        if ('clarify' in location)
            return location;
        const lines = [];
        for (const item of po.items) {
            const remaining = remainingByProduct.get(item.productId);
            if (!remaining || remaining <= 0)
                continue;
            let uom = 'NOS';
            try {
                const product = (await this.products.get(ctx.user, item.productId));
                if (product?.uom)
                    uom = product.uom;
            }
            catch {
            }
            lines.push({
                productId: item.productId,
                label: `${item.product?.description ?? 'product'}${item.product?.productCode ? ` (${item.product.productCode})` : ''}`,
                quantity: remaining,
                purchaseRate: Number(item.rate),
                uom,
            });
        }
        if (lines.length === 0) {
            return { clarify: `PO ${po.poNumber} has no receivable lines. Tell the user.` };
        }
        const total = lines.reduce((sum, line) => sum + line.quantity * line.purchaseRate, 0);
        const shopName = await this.shopName(ctx.user, po.shopId);
        const payload = {
            shopId: po.shopId,
            grDate,
            supplierName: po.supplier,
            purchaseOrderId: po.id,
            ...(typeof input.remarks === 'string' && input.remarks.trim()
                ? { remarks: input.remarks.trim() }
                : { remarks: `Full receipt against ${po.poNumber} (via WhatsApp assistant)` }),
            items: lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                uom: line.uom,
                purchaseRate: line.purchaseRate,
                storageLocationId: location.id,
            })),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: RECEIVE_PO,
            payload,
            summary: this.buildSummary({
                supplierName: `${po.supplier} — receiving *${po.poNumber}* in full`,
                shopName,
                locationLabel: location.code ?? location.name ?? location.id,
                grDate,
                poLinked: true,
                lines,
                total,
                remarks: payload.remarks,
            }),
            steps: [CREATE_GR],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the goods receipt, "cancel" to discard, or describe changes.',
        };
    }
    async resolvePo(user, input) {
        if (typeof input.po_id === 'string' && input.po_id.trim()) {
            const po = (await this.purchaseOrders.get(user, input.po_id.trim()));
            if (!po?.id)
                throw new Error('Purchase order could not be resolved');
            return po;
        }
        const query = String(input.po_number ?? '').trim();
        if (!query)
            throw new Error('po_number or po_id is required');
        const found = await this.purchaseOrders.list(user, { search: query, take: 10 });
        const rows = found.data ?? [];
        const match = rows.find((row) => row.poNumber?.toLowerCase() === query.toLowerCase()) ?? (rows.length === 1 ? rows[0] : undefined);
        if (!match) {
            if (rows.length > 1) {
                return {
                    clarify: `Multiple purchase orders match "${query}". Ask the user which one they mean.`,
                    candidates: rows.map((row) => ({ id: row.id, poNumber: row.poNumber })),
                };
            }
            return { clarify: `No purchase order matches "${query}". Ask the user for the exact PO number.` };
        }
        return (await this.purchaseOrders.get(user, match.id));
    }
    async draftGoodsReceipt(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Goods receipt drafting is only available in a chat conversation');
        }
        const supplierName = String(input.supplier_name ?? '').trim();
        if (!supplierName)
            throw new Error('supplier_name is required');
        const shopId = this.resolveShopId(ctx.user, input.shop_id);
        const grDate = this.resolveGrDate(input.gr_date);
        const location = await this.resolveStorageLocation(ctx.user, shopId, input.storage_location);
        if ('clarify' in location)
            return location;
        const rawItems = Array.isArray(input.items) ? input.items : [];
        if (rawItems.length === 0)
            throw new Error('At least one item is required');
        const lines = [];
        for (const raw of rawItems) {
            const resolved = await this.resolveLine(ctx.user, shopId, raw);
            if ('clarify' in resolved)
                return resolved;
            lines.push(resolved);
        }
        const total = lines.reduce((sum, line) => sum + line.quantity * line.purchaseRate, 0);
        const shopName = await this.shopName(ctx.user, shopId);
        const purchaseOrderId = typeof input.purchase_order_id === 'string' && input.purchase_order_id.trim()
            ? input.purchase_order_id.trim()
            : undefined;
        const payload = {
            shopId,
            grDate,
            supplierName,
            ...(purchaseOrderId ? { purchaseOrderId } : {}),
            ...(typeof input.remarks === 'string' && input.remarks.trim()
                ? { remarks: input.remarks.trim() }
                : {}),
            items: lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                uom: line.uom,
                purchaseRate: line.purchaseRate,
                storageLocationId: location.id,
                ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
                ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
            })),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_GR,
            payload,
            summary: this.buildSummary({
                supplierName,
                shopName,
                locationLabel: location.code ?? location.name ?? location.id,
                grDate,
                poLinked: Boolean(purchaseOrderId),
                lines,
                total,
                remarks: payload.remarks,
            }),
            steps: [CREATE_GR],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the goods receipt, "cancel" to discard, or describe changes.',
        };
    }
    buildSummary(draft) {
        const lines = draft.lines.map((l) => `- ${l.quantity} ${l.uom} × ${l.label} @ ${money(l.purchaseRate)} = ${money(l.quantity * l.purchaseRate)}`);
        return [
            `📦 *Goods receipt draft*`,
            `Supplier: ${draft.supplierName}`,
            `Warehouse: ${draft.shopName}`,
            `Storage location: ${draft.locationLabel}`,
            `Date: ${draft.grDate}`,
            ...(draft.poLinked ? ['Linked to a purchase order (quantities will be validated against it).'] : []),
            ...lines,
            `Total: ${money(draft.total)}`,
            ...(draft.remarks ? [`Remarks: ${draft.remarks}`] : []),
            '',
            'Reply *approve* to create this goods receipt (as an ERP draft — stock moves only when it is posted), *cancel* to discard, or tell me what to change.',
        ].join('\n');
    }
    async resolveStorageLocation(user, shopId, requested) {
        const rows = (await this.storageLocations.list(user, {
            shop_id: shopId,
        }));
        const active = rows.filter((row) => row.isActive !== false);
        if (active.length === 0) {
            return {
                clarify: 'This warehouse has no active storage locations. Ask the user to create one under Storage Locations in the ERP first.',
            };
        }
        const query = typeof requested === 'string' ? requested.trim() : '';
        if (query) {
            const matches = active.filter((row) => row.code?.toLowerCase() === query.toLowerCase() ||
                row.name?.toLowerCase() === query.toLowerCase());
            if (matches.length === 1)
                return matches[0];
            return {
                clarify: `No single storage location matches "${query}". Ask the user which one they mean.`,
                candidates: active.map((row) => ({ id: row.id, code: row.code, name: row.name })),
            };
        }
        if (active.length === 1)
            return active[0];
        return {
            clarify: 'Multiple storage locations exist for this warehouse. Ask the user which one to receive into.',
            candidates: active.map((row) => ({ id: row.id, code: row.code, name: row.name })),
        };
    }
    async resolveLine(user, shopId, raw) {
        const quantity = Number(raw.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error('Each item needs a positive quantity');
        }
        let product = null;
        if (typeof raw.product_id === 'string' && raw.product_id.trim()) {
            product = (await this.products.get(user, raw.product_id.trim()));
        }
        else {
            const query = String(raw.product_query ?? '').trim();
            if (!query)
                throw new Error('Each item needs product_id or product_query');
            const found = await this.products.list(user, { search: query, shop_id: shopId, limit: 5 });
            const candidates = found.data;
            if (candidates.length === 0) {
                return { clarify: `No product matches "${query}". Ask the user for the exact product name or code.` };
            }
            const exact = candidates.filter((c) => c.productCode?.toLowerCase() === query.toLowerCase() ||
                c.description?.toLowerCase() === query.toLowerCase());
            if (candidates.length > 1 && exact.length !== 1) {
                return {
                    clarify: `Multiple products match "${query}". Ask the user which one they mean.`,
                    candidates: candidates.map((c) => ({
                        id: c.id,
                        productCode: c.productCode,
                        description: c.description,
                    })),
                };
            }
            product = exact[0] ?? candidates[0];
        }
        if (!product?.id)
            throw new Error('Product could not be resolved');
        const purchaseRate = raw.purchase_rate !== undefined && raw.purchase_rate !== null
            ? Number(raw.purchase_rate)
            : Number(product.purchasePrice);
        if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
            return {
                clarify: `No valid unit cost for ${product.description ?? product.id}. Ask the user for the purchase rate.`,
            };
        }
        const uom = (typeof raw.uom === 'string' && raw.uom.trim()) || product.uom?.trim() || 'UNIT';
        const batchNumber = typeof raw.batch_number === 'string' && raw.batch_number.trim()
            ? raw.batch_number.trim()
            : undefined;
        const expiryDate = this.resolveExpiryDate(raw.expiry_date);
        return {
            productId: product.id,
            label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
            quantity,
            purchaseRate,
            uom,
            ...(batchNumber ? { batchNumber } : {}),
            ...(expiryDate ? { expiryDate } : {}),
        };
    }
    resolveShopId(user, requested) {
        const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
        if (!shopId)
            throw new Error('No warehouse/shop is accessible for this account');
        return shopId;
    }
    resolveGrDate(requested) {
        const today = new Date().toISOString().slice(0, 10);
        if (typeof requested !== 'string' || !requested.trim())
            return today;
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error('gr_date must be YYYY-MM-DD');
        if (date > today)
            throw new Error('GR date must not be in the future');
        return date;
    }
    resolveExpiryDate(requested) {
        if (typeof requested !== 'string' || !requested.trim())
            return undefined;
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error('expiry_date must be YYYY-MM-DD');
        return date;
    }
    async shopName(user, shopId) {
        try {
            const result = await this.shops.list(user, {});
            const rows = result.data ?? [];
            const shop = rows.find((row) => row.id === shopId);
            return shop?.shopName ?? shop?.name ?? shopId;
        }
        catch {
            return shopId;
        }
    }
};
exports.GoodsReceiptWriteToolsService = GoodsReceiptWriteToolsService;
exports.GoodsReceiptWriteToolsService = GoodsReceiptWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        products_service_1.ProductsService,
        storage_locations_service_1.StorageLocationsService,
        shops_service_1.ShopsService,
        goods_receipts_service_1.GoodsReceiptsService,
        purchase_orders_service_1.PurchaseOrdersService])
], GoodsReceiptWriteToolsService);
//# sourceMappingURL=goods-receipt-write-tools.service.js.map