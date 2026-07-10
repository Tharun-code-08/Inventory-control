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
exports.StockTransferWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("../../../../products/products.service");
const shops_service_1 = require("../../../../shops/shops.service");
const stock_transfers_service_1 = require("../../../../stock-transfers/stock-transfers.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_ST = 'inventory.create_stock_transfer';
function money(value) {
    const num = Number(value ?? 0);
    return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}
let StockTransferWriteToolsService = class StockTransferWriteToolsService {
    registry;
    executor;
    tasks;
    products;
    shops;
    stockTransfers;
    constructor(registry, executor, tasks, products, shops, stockTransfers) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.products = products;
        this.shops = shops;
        this.stockTransfers = stockTransfers;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_stock_transfer',
            id: CREATE_ST,
            description: 'Draft a stock transfer between two warehouses (shops) for the user to approve. This does NOT create ' +
                'the transfer — it creates a pending draft; the user must reply "approve" first. The approved transfer ' +
                'is a DRAFT in the ERP — stock only moves when a human posts it. Provide from_shop and to_shop as shop ' +
                'names or ids (both required; must be different shops in the same company). Each item needs product_id ' +
                '(preferred) or exact product_query, plus quantity and uom. Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    from_shop_id: { type: 'string', description: 'Source shop/warehouse id' },
                    from_shop: { type: 'string', description: 'Source shop name when id is unknown' },
                    to_shop_id: { type: 'string', description: 'Destination shop/warehouse id' },
                    to_shop: { type: 'string', description: 'Destination shop name when id is unknown' },
                    from_storage_location_id: { type: 'string', description: 'Source storage location id (optional)' },
                    to_storage_location_id: { type: 'string', description: 'Destination storage location id (optional)' },
                    transfer_date: { type: 'string', description: 'Transfer date YYYY-MM-DD (defaults to today, must not be future)' },
                    notes: { type: 'string' },
                    items: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                product_id: { type: 'string' },
                                product_query: { type: 'string', description: 'Product name or code when id is unknown' },
                                quantity: { type: 'number', exclusiveMinimum: 0 },
                                uom: { type: 'string', description: 'Unit of measure (defaults to the product UOM)' },
                            },
                            required: ['quantity'],
                        },
                    },
                },
                required: ['items'],
            },
            requiredPermission: 'stock_transfer:create',
            featureFlag: 'stock',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftStockTransfer(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_ST,
            run: (user, payload, task, step) => this.stockTransfers.create(user, {
                ...payload,
                idempotencyKey: `agent-task:${task.id}:${step.order}`,
            }),
            verify: (result) => {
                const st = result;
                if (!st?.id || !st?.transferNumber) {
                    throw new Error('Stock transfer creation returned an unexpected result shape');
                }
            },
            describe: (result) => {
                const st = result;
                const lineCount = Array.isArray(st.items) ? st.items.length : '?';
                return (`✅ Stock transfer *${st.transferNumber}* created as a draft (${lineCount} line${lineCount === 1 ? '' : 's'}). ` +
                    'Post it under Stock Transfers in the ERP to move the stock.');
            },
        });
    }
    async draftStockTransfer(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Stock transfer drafting is only available in a chat conversation');
        }
        const allShops = await this.loadShops(ctx.user);
        const fromShop = await this.resolveShop(allShops, input.from_shop_id, input.from_shop, 'source');
        if ('clarify' in fromShop)
            return fromShop;
        const toShop = await this.resolveShop(allShops, input.to_shop_id, input.to_shop, 'destination');
        if ('clarify' in toShop)
            return toShop;
        if (fromShop.id === toShop.id) {
            return { clarify: 'Source and destination warehouses must be different shops. Ask the user which two warehouses to transfer between.' };
        }
        const transferDate = this.resolveTransferDate(input.transfer_date);
        const rawItems = Array.isArray(input.items) ? input.items : [];
        if (rawItems.length === 0)
            throw new Error('At least one item is required');
        const lines = [];
        for (const raw of rawItems) {
            const resolved = await this.resolveLine(ctx.user, fromShop.id, raw);
            if ('clarify' in resolved)
                return resolved;
            lines.push(resolved);
        }
        const payload = {
            fromShopId: fromShop.id,
            toShopId: toShop.id,
            transferDate,
            ...(typeof input.from_storage_location_id === 'string' && input.from_storage_location_id.trim()
                ? { fromStorageLocationId: input.from_storage_location_id.trim() }
                : {}),
            ...(typeof input.to_storage_location_id === 'string' && input.to_storage_location_id.trim()
                ? { toStorageLocationId: input.to_storage_location_id.trim() }
                : {}),
            ...(typeof input.notes === 'string' && input.notes.trim()
                ? { notes: input.notes.trim() }
                : {}),
            items: lines.map(({ productId, quantity, uom }) => ({ productId, quantity, uom })),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_ST,
            payload,
            summary: this.buildSummary({
                fromShopName: this.shopLabel(fromShop),
                toShopName: this.shopLabel(toShop),
                transferDate,
                lines,
                notes: payload.notes,
            }),
            steps: [CREATE_ST],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create this stock transfer (as an ERP draft — stock moves only on post), "cancel" to discard, or describe changes.',
        };
    }
    buildSummary(draft) {
        const linesList = draft.lines.map((l) => `- ${l.quantity} ${l.uom} × ${l.label}`);
        return [
            `🔄 *Stock transfer draft*`,
            `From: ${draft.fromShopName}`,
            `To: ${draft.toShopName}`,
            `Date: ${draft.transferDate}`,
            ...linesList,
            ...(draft.notes ? [`Notes: ${draft.notes}`] : []),
            '',
            'Reply *approve* to create this stock transfer (as an ERP draft — stock moves only when posted), *cancel* to discard, or tell me what to change.',
        ].join('\n');
    }
    async loadShops(user) {
        try {
            const result = await this.shops.list(user, {});
            return (result.data ?? []);
        }
        catch {
            return [];
        }
    }
    async resolveShop(shops, id, query, role) {
        if (typeof id === 'string' && id.trim()) {
            const found = shops.find((s) => s.id === id.trim());
            if (!found)
                return { clarify: `The ${role} shop id "${id}" was not found in your accessible shops. Ask the user which shop to use.` };
            return found;
        }
        if (typeof query === 'string' && query.trim()) {
            const q = query.trim().toLowerCase();
            const matches = shops.filter((s) => s.shopName?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
            if (matches.length === 0) {
                return { clarify: `No ${role} warehouse matches "${query}". Ask the user for the exact shop name.`, candidates: shops.map((s) => ({ id: s.id, name: this.shopLabel(s) })) };
            }
            const exact = matches.filter((s) => s.shopName?.toLowerCase() === q || s.name?.toLowerCase() === q);
            if (matches.length > 1 && exact.length !== 1) {
                return {
                    clarify: `Multiple ${role} warehouses match "${query}". Ask the user which one they mean.`,
                    candidates: matches.map((s) => ({ id: s.id, name: this.shopLabel(s) })),
                };
            }
            return exact[0] ?? matches[0];
        }
        if (shops.length === 1)
            return shops[0];
        return {
            clarify: `Which warehouse is the ${role}? Ask the user to specify.`,
            candidates: shops.map((s) => ({ id: s.id, name: this.shopLabel(s) })),
        };
    }
    shopLabel(shop) {
        return shop.shopName ?? shop.name ?? shop.id;
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
                    candidates: candidates.map((c) => ({ id: c.id, productCode: c.productCode, description: c.description })),
                };
            }
            product = exact[0] ?? candidates[0];
        }
        if (!product?.id)
            throw new Error('Product could not be resolved');
        const uom = (typeof raw.uom === 'string' && raw.uom.trim()) ||
            product.uom?.trim() ||
            'UNIT';
        return {
            productId: product.id,
            label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
            quantity,
            uom,
        };
    }
    resolveTransferDate(requested) {
        const today = new Date().toISOString().slice(0, 10);
        if (typeof requested !== 'string' || !requested.trim())
            return today;
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error('transfer_date must be YYYY-MM-DD');
        if (date > today)
            throw new Error('transfer_date cannot be in the future');
        return date;
    }
};
exports.StockTransferWriteToolsService = StockTransferWriteToolsService;
exports.StockTransferWriteToolsService = StockTransferWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        products_service_1.ProductsService,
        shops_service_1.ShopsService,
        stock_transfers_service_1.StockTransfersService])
], StockTransferWriteToolsService);
//# sourceMappingURL=stock-transfer-write-tools.service.js.map