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
exports.SalesWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("../../../../customers/customers.service");
const products_service_1 = require("../../../../products/products.service");
const sales_orders_service_1 = require("../../../../sales-orders/sales-orders.service");
const shops_service_1 = require("../../../../shops/shops.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_SO = 'sales.create_so';
function money(value) {
    const num = Number(value ?? 0);
    return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}
let SalesWriteToolsService = class SalesWriteToolsService {
    registry;
    executor;
    tasks;
    products;
    customers;
    shops;
    salesOrders;
    constructor(registry, executor, tasks, products, customers, shops, salesOrders) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.products = products;
        this.customers = customers;
        this.shops = shops;
        this.salesOrders = salesOrders;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_sales_order',
            id: CREATE_SO,
            description: 'Draft a sales order for the user to approve. This does NOT create the SO — it creates a pending draft; ' +
                'the user must reply "approve" before anything is created. Provide customer_id (preferred) or an exact ' +
                'customer_query (name or code). Each item needs product_id (preferred; find it with check_stock/' +
                'search_products) or an exact product_query, plus quantity. unit_price is optional and defaults to the ' +
                "product's selling price. Relay the returned summary to the user verbatim.",
            inputSchema: {
                type: 'object',
                properties: {
                    customer_id: { type: 'string', description: 'Customer id when already known' },
                    customer_query: { type: 'string', description: 'Customer name or code, used when customer_id is unknown' },
                    shop_id: { type: 'string', description: 'Warehouse/shop id (defaults to the user\'s shop)' },
                    order_date: { type: 'string', description: 'Order date YYYY-MM-DD (defaults to today)' },
                    expected_date: { type: 'string', description: 'Expected delivery date YYYY-MM-DD (may be in the future)' },
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
                                unit_price: { type: 'number', minimum: 0, description: 'Unit price in ₹' },
                            },
                            required: ['quantity'],
                        },
                    },
                },
                required: ['items'],
            },
            requiredPermission: 'shop:write',
            featureFlag: 'sales',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftSalesOrder(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_SO,
            run: (user, payload, task, step) => this.salesOrders.create(user, {
                ...payload,
                idempotencyKey: `agent-task:${task.id}:${step.order}`,
            }),
            verify: (result) => {
                const so = result;
                if (!so?.id || !so?.soNumber) {
                    throw new Error('SO creation returned an unexpected result shape');
                }
            },
            describe: (result) => {
                const so = result;
                return `✅ Sales order *${so.soNumber}* created as a draft (total ${money(so.totalValue)}). You can confirm and fulfill it under Sales in the ERP.`;
            },
        });
    }
    async draftSalesOrder(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Sales drafting is only available in a chat conversation');
        }
        const shopId = this.resolveShopId(ctx.user, input.shop_id);
        const customer = await this.resolveCustomer(ctx.user, shopId, input);
        if ('clarify' in customer)
            return customer;
        const orderDate = this.resolveDate(input.order_date, 'order_date');
        const expectedDate = typeof input.expected_date === 'string' && input.expected_date.trim()
            ? this.resolveDate(input.expected_date, 'expected_date')
            : undefined;
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
        const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
        const shopName = await this.shopName(ctx.user, shopId);
        const payload = {
            shopId,
            customerId: customer.id,
            orderDate,
            ...(expectedDate ? { expectedDate } : {}),
            currency: 'INR',
            ...(typeof input.remarks === 'string' && input.remarks.trim()
                ? { remarks: input.remarks.trim() }
                : {}),
            items: lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_SO,
            payload,
            summary: this.buildSummary({
                customerLabel: this.customerLabel(customer),
                shopName,
                orderDate,
                expectedDate,
                lines,
                total,
                remarks: payload.remarks,
            }),
            steps: [CREATE_SO],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the sales order, "cancel" to discard, or describe changes.',
        };
    }
    buildSummary(draft) {
        const lines = draft.lines.map((l) => `- ${l.quantity} × ${l.label} @ ${money(l.unitPrice)} = ${money(l.quantity * l.unitPrice)}`);
        return [
            `🧾 *Sales order draft*`,
            `Customer: ${draft.customerLabel}`,
            `Shop: ${draft.shopName}`,
            `Date: ${draft.orderDate}`,
            ...(draft.expectedDate ? [`Expected delivery: ${draft.expectedDate}`] : []),
            ...lines,
            `Total (before tax): ${money(draft.total)}`,
            ...(draft.remarks ? [`Remarks: ${draft.remarks}`] : []),
            '',
            'Reply *approve* to create this sales order, *cancel* to discard, or tell me what to change.',
        ].join('\n');
    }
    async resolveCustomer(user, shopId, input) {
        if (typeof input.customer_id === 'string' && input.customer_id.trim()) {
            return { id: input.customer_id.trim() };
        }
        const query = String(input.customer_query ?? '').trim();
        if (!query)
            throw new Error('customer_id or customer_query is required');
        const found = await this.customers.list(user, { search: query, take: 5 });
        const candidates = (found.data ?? []);
        const inShop = candidates.filter((c) => !c.shopId || c.shopId === shopId);
        if (inShop.length === 0) {
            return { clarify: `No customer matches "${query}". Ask the user for the exact customer name or code.` };
        }
        const exact = inShop.filter((c) => c.customerCode?.toLowerCase() === query.toLowerCase() ||
            c.customerName?.toLowerCase() === query.toLowerCase());
        if (inShop.length > 1 && exact.length !== 1) {
            return {
                clarify: `Multiple customers match "${query}". Ask the user which one they mean.`,
                candidates: inShop.map((c) => ({
                    id: c.id,
                    customerCode: c.customerCode,
                    customerName: c.customerName,
                })),
            };
        }
        return exact[0] ?? inShop[0];
    }
    customerLabel(customer) {
        if (!customer.customerName)
            return customer.id;
        return `${customer.customerName}${customer.customerCode ? ` (${customer.customerCode})` : ''}`;
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
        const unitPrice = raw.unit_price !== undefined && raw.unit_price !== null
            ? Number(raw.unit_price)
            : Number(product.sellingPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return {
                clarify: `No valid unit price for ${product.description ?? product.id}. Ask the user for the price.`,
            };
        }
        return {
            productId: product.id,
            label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
            quantity,
            unitPrice,
        };
    }
    resolveShopId(user, requested) {
        const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
        if (!shopId)
            throw new Error('No warehouse/shop is accessible for this account');
        return shopId;
    }
    resolveDate(requested, field) {
        const today = new Date().toISOString().slice(0, 10);
        if (typeof requested !== 'string' || !requested.trim())
            return today;
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error(`${field} must be YYYY-MM-DD`);
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
exports.SalesWriteToolsService = SalesWriteToolsService;
exports.SalesWriteToolsService = SalesWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        products_service_1.ProductsService,
        customers_service_1.CustomersService,
        shops_service_1.ShopsService,
        sales_orders_service_1.SalesOrdersService])
], SalesWriteToolsService);
//# sourceMappingURL=sales-write-tools.service.js.map