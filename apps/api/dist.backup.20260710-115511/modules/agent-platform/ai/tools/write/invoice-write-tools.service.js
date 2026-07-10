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
exports.InvoiceWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("../../../../customers/customers.service");
const invoices_service_1 = require("../../../../invoices/invoices.service");
const sales_orders_service_1 = require("../../../../sales-orders/sales-orders.service");
const shops_service_1 = require("../../../../shops/shops.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_INVOICE = 'sales.create_invoice';
function money(value) {
    const num = Number(value ?? 0);
    return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}
let InvoiceWriteToolsService = class InvoiceWriteToolsService {
    registry;
    executor;
    tasks;
    customers;
    shops;
    salesOrders;
    invoices;
    constructor(registry, executor, tasks, customers, shops, salesOrders, invoices) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.customers = customers;
        this.shops = shops;
        this.salesOrders = salesOrders;
        this.invoices = invoices;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_invoice',
            id: CREATE_INVOICE,
            description: 'Draft a customer invoice for the user to approve. This does NOT create the invoice — it creates a ' +
                'pending draft; the user must reply "approve" first. IMPORTANT: on approval the invoice is ISSUED ' +
                'immediately (not an ERP draft) and, when invoice emails are enabled, the customer is emailed a copy ' +
                'automatically — make sure the user understands this. Two ways to use it: (a) pass sales_order_id or an ' +
                'exact sales_order_number to invoice a confirmed sales order — customer and total default from the order; ' +
                'or (b) pass customer_id / exact customer_query plus total_value for a standalone invoice. Relay the ' +
                'returned summary to the user verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    sales_order_id: { type: 'string', description: 'Sales order id to invoice (customer and total default from it)' },
                    sales_order_number: { type: 'string', description: 'Exact SO number, e.g. SO-00042, when the id is unknown' },
                    customer_id: { type: 'string', description: 'Customer id for a standalone invoice' },
                    customer_query: { type: 'string', description: 'Customer name or code, used when customer_id is unknown' },
                    shop_id: { type: 'string', description: "Warehouse/shop id (defaults to the sales order's shop, else the user's shop)" },
                    invoice_date: { type: 'string', description: 'Invoice date YYYY-MM-DD (defaults to today, must not be in the future)' },
                    due_date: { type: 'string', description: 'Payment due date YYYY-MM-DD (may be in the future)' },
                    total_value: { type: 'number', minimum: 0, description: 'Invoice total in ₹ (required unless a sales order is given)' },
                    remarks: { type: 'string' },
                },
                required: [],
            },
            requiredPermission: 'shop:write',
            featureFlag: 'sales',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftInvoice(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_INVOICE,
            run: (user, payload, task, step) => this.invoices.create(user, {
                ...payload,
                idempotencyKey: `agent-task:${task.id}:${step.order}`,
            }),
            verify: (result) => {
                const invoice = result;
                if (!invoice?.id || !invoice?.invoiceNumber) {
                    throw new Error('Invoice creation returned an unexpected result shape');
                }
            },
            describe: (result) => {
                const invoice = result;
                return (`✅ Invoice *${invoice.invoiceNumber}* issued (total ${money(invoice.totalValue)}). ` +
                    'If invoice emails are enabled, the customer has been emailed a copy. Manage it under Invoices in the ERP.');
            },
        });
    }
    async draftInvoice(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Invoice drafting is only available in a chat conversation');
        }
        const salesOrder = await this.resolveSalesOrder(ctx.user, input);
        if (salesOrder && 'clarify' in salesOrder)
            return salesOrder;
        const shopId = salesOrder?.shopId ?? this.resolveShopId(ctx.user, input.shop_id);
        let customerId;
        let customerLabel;
        if (salesOrder) {
            if (!salesOrder.customerId)
                throw new Error('The sales order has no customer to invoice');
            customerId = salesOrder.customerId;
            customerLabel = salesOrder.customer
                ? this.customerLabel(salesOrder.customer)
                : salesOrder.customerId;
        }
        else {
            const customer = await this.resolveCustomer(ctx.user, shopId, input);
            if ('clarify' in customer)
                return customer;
            customerId = customer.id;
            customerLabel = this.customerLabel(customer);
        }
        const invoiceDate = this.resolveInvoiceDate(input.invoice_date);
        const dueDate = typeof input.due_date === 'string' && input.due_date.trim()
            ? this.resolveDueDate(input.due_date, invoiceDate)
            : undefined;
        let totalValue;
        if (input.total_value !== undefined && input.total_value !== null) {
            totalValue = Number(input.total_value);
        }
        else if (salesOrder) {
            totalValue = Number(salesOrder.totalValue);
        }
        else {
            throw new Error('total_value is required unless a sales order is given');
        }
        if (!Number.isFinite(totalValue) || totalValue < 0) {
            throw new Error('total_value must be a non-negative amount');
        }
        const shopName = await this.shopName(ctx.user, shopId);
        const payload = {
            shopId,
            customerId,
            invoiceDate,
            totalValue,
            ...(salesOrder ? { salesOrderId: salesOrder.id } : {}),
            ...(dueDate ? { dueDate } : {}),
            ...(typeof input.remarks === 'string' && input.remarks.trim()
                ? { remarks: input.remarks.trim() }
                : {}),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_INVOICE,
            payload,
            summary: this.buildSummary({
                customerLabel,
                shopName,
                invoiceDate,
                dueDate,
                soNumber: salesOrder?.soNumber,
                totalValue,
                remarks: payload.remarks,
            }),
            steps: [CREATE_INVOICE],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to issue the invoice, "cancel" to discard, or describe changes.',
        };
    }
    buildSummary(draft) {
        return [
            `💳 *Invoice draft*`,
            `Customer: ${draft.customerLabel}`,
            `Shop: ${draft.shopName}`,
            `Invoice date: ${draft.invoiceDate}`,
            ...(draft.dueDate ? [`Due date: ${draft.dueDate}`] : []),
            ...(draft.soNumber ? [`Linked sales order: ${draft.soNumber}`] : []),
            `Total: ${money(draft.totalValue)}`,
            ...(draft.remarks ? [`Remarks: ${draft.remarks}`] : []),
            '',
            '⚠️ Approving ISSUES this invoice immediately — and if invoice emails are enabled, the customer is emailed a copy automatically.',
            'Reply *approve* to issue this invoice, *cancel* to discard, or tell me what to change.',
        ].join('\n');
    }
    async resolveSalesOrder(user, input) {
        let so;
        if (typeof input.sales_order_id === 'string' && input.sales_order_id.trim()) {
            so = (await this.salesOrders.get(user, input.sales_order_id.trim()));
        }
        else if (typeof input.sales_order_number === 'string' && input.sales_order_number.trim()) {
            const query = input.sales_order_number.trim().toLowerCase();
            const found = await this.salesOrders.list(user, { take: 50 });
            const rows = (found.data ?? []);
            so = rows.find((row) => row.soNumber?.toLowerCase() === query);
            if (!so) {
                return {
                    clarify: `No recent sales order matches "${input.sales_order_number}". Ask the user for the exact SO number or id.`,
                };
            }
        }
        else {
            return undefined;
        }
        if (so.status === 'DRAFT' || so.status === 'CANCELLED') {
            return {
                clarify: `Sales order ${so.soNumber ?? so.id} is ${so.status} and cannot be invoiced. It must be confirmed first.`,
            };
        }
        return so;
    }
    async resolveCustomer(user, shopId, input) {
        if (typeof input.customer_id === 'string' && input.customer_id.trim()) {
            return { id: input.customer_id.trim() };
        }
        const query = String(input.customer_query ?? '').trim();
        if (!query) {
            throw new Error('customer_id, customer_query, or a sales order is required');
        }
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
    resolveShopId(user, requested) {
        const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
        if (!shopId)
            throw new Error('No warehouse/shop is accessible for this account');
        return shopId;
    }
    resolveInvoiceDate(requested) {
        const today = new Date().toISOString().slice(0, 10);
        if (typeof requested !== 'string' || !requested.trim())
            return today;
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error('invoice_date must be YYYY-MM-DD');
        if (date > today)
            throw new Error('invoice_date cannot be in the future');
        return date;
    }
    resolveDueDate(requested, invoiceDate) {
        const date = requested.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error('due_date must be YYYY-MM-DD');
        if (date < invoiceDate)
            throw new Error('due_date cannot be before the invoice date');
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
exports.InvoiceWriteToolsService = InvoiceWriteToolsService;
exports.InvoiceWriteToolsService = InvoiceWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        customers_service_1.CustomersService,
        shops_service_1.ShopsService,
        sales_orders_service_1.SalesOrdersService,
        invoices_service_1.InvoicesService])
], InvoiceWriteToolsService);
//# sourceMappingURL=invoice-write-tools.service.js.map