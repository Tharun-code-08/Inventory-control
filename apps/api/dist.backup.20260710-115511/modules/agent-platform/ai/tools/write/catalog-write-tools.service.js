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
exports.CatalogWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("../../../../products/products.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_PRODUCT = 'catalog.create_product';
const UPDATE_PRODUCT = 'catalog.update_product';
function money(value) {
    const num = Number(value ?? 0);
    return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}
const UPDATABLE_FIELDS = {
    selling_price: 'sellingPrice',
    purchase_price: 'purchasePrice',
    description: 'description',
    category: 'category',
    gst_rate: 'gstRate',
    brand: 'brand',
    is_active: 'isActive',
};
let CatalogWriteToolsService = class CatalogWriteToolsService {
    registry;
    executor;
    tasks;
    products;
    constructor(registry, executor, tasks, products) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.products = products;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_product',
            id: CREATE_PRODUCT,
            description: 'Draft a new catalog product for the user to approve. This does NOT create it — the user must reply ' +
                '"approve" first. Required: product_code (short unique code like ELEC0501 — suggest the next in the ' +
                "user's series if they don't give one, but confirm it), description (product name), category, " +
                'purchase_price and selling_price in ₹. The product starts with zero stock — stock is added later via ' +
                'a goods receipt. Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    product_code: { type: 'string', description: 'Unique short code, e.g. ELEC0501' },
                    description: { type: 'string', description: 'Product name/description' },
                    category: { type: 'string', description: 'Product category, e.g. Electrical' },
                    uom: { type: 'string', description: 'Unit of measure (defaults to NOS)' },
                    purchase_price: { type: 'number', minimum: 0, description: 'Buy price in ₹' },
                    selling_price: { type: 'number', minimum: 0, description: 'Sell price in ₹' },
                    gst_rate: { type: 'number', minimum: 0, maximum: 28, description: 'GST % (optional)' },
                    brand: { type: 'string' },
                    hsn_code: { type: 'string' },
                    shop_id: { type: 'string', description: "Warehouse to assign the product to (defaults to the user's shop)" },
                },
                required: ['product_code', 'description', 'category', 'purchase_price', 'selling_price'],
            },
            requiredPermission: 'product:write',
            featureFlag: 'stock',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftCreateProduct(ctx, input),
        });
        this.registry.register({
            name: 'update_product',
            id: UPDATE_PRODUCT,
            description: 'Draft a product update (price change, rename, category, GST rate, activate/deactivate) for the user to ' +
                'approve. Use for "change selling price of X to 899", "rename product Y", "deactivate Z". This does NOT ' +
                'apply the change — the user must reply "approve" first. Identify the product with product_id (preferred) ' +
                'or an exact product_query. Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    product_id: { type: 'string' },
                    product_query: { type: 'string', description: 'Product name or code, used when product_id is unknown' },
                    selling_price: { type: 'number', minimum: 0, description: 'New sell price in ₹' },
                    purchase_price: { type: 'number', minimum: 0, description: 'New buy price in ₹' },
                    description: { type: 'string', description: 'New product name/description' },
                    category: { type: 'string' },
                    gst_rate: { type: 'number', minimum: 0, maximum: 28 },
                    brand: { type: 'string' },
                    is_active: { type: 'boolean', description: 'false to deactivate, true to reactivate' },
                },
            },
            requiredPermission: 'product:write',
            featureFlag: 'stock',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftUpdateProduct(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_PRODUCT,
            run: async (user, payload) => {
                const dto = payload;
                try {
                    return await this.products.create(user, dto);
                }
                catch (err) {
                    const existing = await this.findByCode(user, dto.productCode);
                    if (existing)
                        return existing;
                    throw err;
                }
            },
            verify: (result) => {
                const product = result;
                if (!product?.id)
                    throw new Error('Product creation returned an unexpected result shape');
            },
            describe: (result) => {
                const product = result;
                return `✅ Product *${product.description}* (${product.productCode}) created with selling price ${money(product.sellingPrice)}. Add stock via a goods receipt when it arrives.`;
            },
        });
        this.executor.registerRunner({
            name: UPDATE_PRODUCT,
            run: (user, payload) => {
                const data = payload;
                return this.products.update(user, data.productId, data.changes);
            },
            verify: (result) => {
                const product = result;
                if (!product?.id)
                    throw new Error('Product update returned an unexpected result shape');
            },
            describe: (result) => {
                const product = result;
                return `✅ Product *${product.description}* (${product.productCode}) updated. Current prices: buy ${money(product.purchasePrice)} / sell ${money(product.sellingPrice)}.`;
            },
        });
    }
    async draftCreateProduct(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Product drafting is only available in a chat conversation');
        }
        const productCode = String(input.product_code ?? '').trim().toUpperCase();
        const description = String(input.description ?? '').trim();
        const category = String(input.category ?? '').trim();
        if (!productCode || !description || !category) {
            throw new Error('product_code, description and category are required');
        }
        const purchasePrice = Number(input.purchase_price);
        const sellingPrice = Number(input.selling_price);
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0)
            throw new Error('purchase_price must be ≥ 0');
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
            throw new Error('selling_price must be ≥ 0');
        const existing = await this.findByCode(ctx.user, productCode);
        if (existing) {
            return {
                clarify: `Product code ${productCode} already exists (${existing.description}). Ask the user for a different code, or whether they meant to update the existing product.`,
            };
        }
        const shopId = this.resolveShopId(ctx.user, input.shop_id);
        const payload = {
            productCode,
            description,
            category,
            uom: (typeof input.uom === 'string' && input.uom.trim()) || 'NOS',
            purchasePrice,
            sellingPrice,
            ...(Number.isFinite(Number(input.gst_rate)) && input.gst_rate !== undefined
                ? { gstRate: Number(input.gst_rate) }
                : {}),
            ...(typeof input.brand === 'string' && input.brand.trim() ? { brand: input.brand.trim() } : {}),
            ...(typeof input.hsn_code === 'string' && input.hsn_code.trim() ? { hsnCode: input.hsn_code.trim() } : {}),
            plants: [{ shopId, openingStock: 0 }],
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_PRODUCT,
            payload,
            summary: [
                `🆕 *New product draft*`,
                `Code: ${productCode}`,
                `Name: ${description}`,
                `Category: ${category} | UoM: ${payload.uom}`,
                `Buy: ${money(purchasePrice)} | Sell: ${money(sellingPrice)}`,
                ...(payload.gstRate !== undefined ? [`GST: ${payload.gstRate}%`] : []),
                `Starts with zero stock — add stock via a goods receipt.`,
                '',
                'Reply *approve* to create this product, *cancel* to discard, or tell me what to change.',
            ].join('\n'),
            steps: [CREATE_PRODUCT],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the product, "cancel" to discard, or describe changes.',
        };
    }
    async draftUpdateProduct(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Product drafting is only available in a chat conversation');
        }
        const product = await this.resolveProduct(ctx.user, input);
        if ('clarify' in product)
            return product;
        const changes = {};
        const described = [];
        for (const [inputKey, dtoKey] of Object.entries(UPDATABLE_FIELDS)) {
            const value = input[inputKey];
            if (value === undefined || value === null)
                continue;
            if (inputKey === 'is_active') {
                changes[dtoKey] = Boolean(value);
                described.push(`${value ? 'Activate' : 'Deactivate'} the product`);
            }
            else if (inputKey === 'selling_price' || inputKey === 'purchase_price' || inputKey === 'gst_rate') {
                const num = Number(value);
                if (!Number.isFinite(num) || num < 0)
                    throw new Error(`${inputKey} must be a number ≥ 0`);
                changes[dtoKey] = num;
                const current = inputKey === 'selling_price' ? product.sellingPrice : inputKey === 'purchase_price' ? product.purchasePrice : product.gstRate;
                described.push(inputKey === 'gst_rate'
                    ? `GST: ${Number(current ?? 0)}% → ${num}%`
                    : `${inputKey === 'selling_price' ? 'Sell' : 'Buy'} price: ${money(current)} → ${money(num)}`);
            }
            else {
                const text = String(value).trim();
                if (!text)
                    continue;
                changes[dtoKey] = text;
                described.push(`${dtoKey}: "${String(product[dtoKey] ?? '—')}" → "${text}"`);
            }
        }
        if (Object.keys(changes).length === 0) {
            throw new Error('No changes given — provide at least one field to update (e.g. selling_price)');
        }
        const label = `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`;
        const payload = { productId: product.id, productLabel: label, changes };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: UPDATE_PRODUCT,
            payload,
            summary: [
                `✏️ *Product update draft*`,
                `Product: ${label}`,
                ...described.map((line) => `- ${line}`),
                '',
                'Reply *approve* to apply this change, *cancel* to discard, or tell me what to change.',
            ].join('\n'),
            steps: [UPDATE_PRODUCT],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to apply the update, "cancel" to discard, or describe changes.',
        };
    }
    async findByCode(user, code) {
        try {
            const found = await this.products.list(user, { search: code, limit: 5 });
            const rows = found.data;
            return rows.find((row) => row.productCode?.toLowerCase() === code.toLowerCase()) ?? null;
        }
        catch {
            return null;
        }
    }
    async resolveProduct(user, input) {
        if (typeof input.product_id === 'string' && input.product_id.trim()) {
            const product = (await this.products.get(user, input.product_id.trim()));
            if (!product?.id)
                throw new Error('Product could not be resolved');
            return product;
        }
        const query = String(input.product_query ?? '').trim();
        if (!query)
            throw new Error('product_id or product_query is required');
        const found = await this.products.list(user, { search: query, limit: 5 });
        const candidates = found.data;
        if (candidates.length === 0) {
            return { clarify: `No product matches "${query}". Ask the user for the exact product name or code.` };
        }
        const exact = candidates.filter((c) => c.productCode?.toLowerCase() === query.toLowerCase() || c.description?.toLowerCase() === query.toLowerCase());
        if (candidates.length > 1 && exact.length !== 1) {
            return {
                clarify: `Multiple products match "${query}". Ask the user which one they mean.`,
                candidates: candidates.map((c) => ({ id: c.id, productCode: c.productCode, description: c.description })),
            };
        }
        return exact[0] ?? candidates[0];
    }
    resolveShopId(user, requested) {
        const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
        if (!shopId)
            throw new Error('No warehouse/shop is accessible for this account');
        return shopId;
    }
};
exports.CatalogWriteToolsService = CatalogWriteToolsService;
exports.CatalogWriteToolsService = CatalogWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        products_service_1.ProductsService])
], CatalogWriteToolsService);
//# sourceMappingURL=catalog-write-tools.service.js.map