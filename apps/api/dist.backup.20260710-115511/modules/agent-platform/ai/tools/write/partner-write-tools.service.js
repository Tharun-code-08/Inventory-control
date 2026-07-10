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
exports.PartnerWriteToolsService = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("../../../../customers/customers.service");
const suppliers_service_1 = require("../../../../suppliers/suppliers.service");
const agent_task_service_1 = require("../../../tasks/agent-task.service");
const task_executor_service_1 = require("../../../tasks/task-executor.service");
const tool_registry_1 = require("../tool-registry");
const CREATE_SUPPLIER = 'partner.create_supplier';
const CREATE_CUSTOMER = 'partner.create_customer';
function optional(input, key) {
    const value = input[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
let PartnerWriteToolsService = class PartnerWriteToolsService {
    registry;
    executor;
    tasks;
    suppliers;
    customers;
    constructor(registry, executor, tasks, suppliers, customers) {
        this.registry = registry;
        this.executor = executor;
        this.tasks = tasks;
        this.suppliers = suppliers;
        this.customers = customers;
    }
    onModuleInit() {
        this.registry.register({
            name: 'create_supplier',
            id: CREATE_SUPPLIER,
            description: 'Draft a new supplier/vendor for the user to approve. This does NOT create it — the user must reply ' +
                '"approve" first. Required: name. Optional: contact person, phone, email, city, GSTIN (tax id). ' +
                'Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Supplier name' },
                    contact_person: { type: 'string' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    city: { type: 'string' },
                    tax_id: { type: 'string', description: 'GSTIN' },
                },
                required: ['name'],
            },
            requiredPermission: 'supplier:write',
            featureFlag: 'purchase',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftSupplier(ctx, input),
        });
        this.registry.register({
            name: 'create_customer',
            id: CREATE_CUSTOMER,
            description: 'Draft a new customer for the user to approve. This does NOT create it — the user must reply "approve" ' +
                'first. Required: name. Optional: phone, email, city, GSTIN (tax id). Relay the returned summary verbatim.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Customer name' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    city: { type: 'string' },
                    tax_id: { type: 'string', description: 'GSTIN' },
                },
                required: ['name'],
            },
            requiredPermission: 'shop:write',
            featureFlag: 'sales',
            version: 1,
            confirmationRequired: true,
            costLevel: 'low',
            auditRequired: true,
            handler: (ctx, input) => this.draftCustomer(ctx, input),
        });
        this.executor.registerRunner({
            name: CREATE_SUPPLIER,
            run: async (user, payload) => {
                const dto = payload;
                const existing = await this.findSupplier(user, dto.supplierName);
                if (existing)
                    return existing;
                return this.suppliers.create(user, dto);
            },
            verify: (result) => {
                const row = result;
                if (!row?.id)
                    throw new Error('Supplier creation returned an unexpected result shape');
            },
            describe: (result) => {
                const row = result;
                return `✅ Supplier *${row.supplierName}*${row.supplierCode ? ` (${row.supplierCode})` : ''} created. You can now raise POs against them.`;
            },
        });
        this.executor.registerRunner({
            name: CREATE_CUSTOMER,
            run: async (user, payload) => {
                const dto = payload;
                const existing = await this.findCustomer(user, dto.customerName);
                if (existing)
                    return existing;
                return this.customers.create(user, dto);
            },
            verify: (result) => {
                const row = result;
                if (!row?.id)
                    throw new Error('Customer creation returned an unexpected result shape');
            },
            describe: (result) => {
                const row = result;
                return `✅ Customer *${row.customerName}*${row.customerCode ? ` (${row.customerCode})` : ''} created. You can now raise sales orders and invoices for them.`;
            },
        });
    }
    async draftSupplier(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Supplier drafting is only available in a chat conversation');
        }
        const name = String(input.name ?? '').trim();
        if (!name)
            throw new Error('name is required');
        const existing = await this.findSupplier(ctx.user, name);
        if (existing) {
            return {
                clarify: `A supplier named "${existing.supplierName}" already exists${existing.supplierCode ? ` (${existing.supplierCode})` : ''}. Tell the user — they may not need to create it again.`,
            };
        }
        const payload = {
            supplierName: name,
            ...(optional(input, 'contact_person') ? { contactPerson: optional(input, 'contact_person') } : {}),
            ...(optional(input, 'phone') ? { phone: optional(input, 'phone') } : {}),
            ...(optional(input, 'email') ? { email: optional(input, 'email') } : {}),
            ...(optional(input, 'city') ? { city: optional(input, 'city') } : {}),
            ...(optional(input, 'tax_id') ? { taxId: optional(input, 'tax_id') } : {}),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_SUPPLIER,
            payload,
            summary: [
                `🏭 *New supplier draft*`,
                `Name: ${name}`,
                ...(payload.contactPerson ? [`Contact: ${payload.contactPerson}`] : []),
                ...(payload.phone ? [`Phone: ${payload.phone}`] : []),
                ...(payload.email ? [`Email: ${payload.email}`] : []),
                ...(payload.city ? [`City: ${payload.city}`] : []),
                ...(payload.taxId ? [`GSTIN: ${payload.taxId}`] : []),
                '',
                'Reply *approve* to create this supplier, *cancel* to discard, or tell me what to change.',
            ].join('\n'),
            steps: [CREATE_SUPPLIER],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the supplier, "cancel" to discard, or describe changes.',
        };
    }
    async draftCustomer(ctx, input) {
        if (!ctx.conversationId || !ctx.companyId) {
            throw new Error('Customer drafting is only available in a chat conversation');
        }
        const name = String(input.name ?? '').trim();
        if (!name)
            throw new Error('name is required');
        const existing = await this.findCustomer(ctx.user, name);
        if (existing) {
            return {
                clarify: `A customer named "${existing.customerName}" already exists${existing.customerCode ? ` (${existing.customerCode})` : ''}. Tell the user — they may not need to create it again.`,
            };
        }
        const payload = {
            customerName: name,
            ...(optional(input, 'phone') ? { phone: optional(input, 'phone') } : {}),
            ...(optional(input, 'email') ? { email: optional(input, 'email') } : {}),
            ...(optional(input, 'city') ? { city: optional(input, 'city') } : {}),
            ...(optional(input, 'tax_id') ? { taxId: optional(input, 'tax_id') } : {}),
        };
        const task = await this.tasks.createDraft({
            companyId: ctx.companyId,
            conversationId: ctx.conversationId,
            requestedById: ctx.user.id,
            type: CREATE_CUSTOMER,
            payload,
            summary: [
                `👤 *New customer draft*`,
                `Name: ${name}`,
                ...(payload.phone ? [`Phone: ${payload.phone}`] : []),
                ...(payload.email ? [`Email: ${payload.email}`] : []),
                ...(payload.city ? [`City: ${payload.city}`] : []),
                ...(payload.taxId ? [`GSTIN: ${payload.taxId}`] : []),
                '',
                'Reply *approve* to create this customer, *cancel* to discard, or tell me what to change.',
            ].join('\n'),
            steps: [CREATE_CUSTOMER],
        });
        return {
            task_number: task.taskNumber,
            status: task.status,
            summary: task.summary,
            note: 'Draft created. The user must reply "approve" to create the customer, "cancel" to discard, or describe changes.',
        };
    }
    async findSupplier(user, name) {
        try {
            const result = await this.suppliers.list(user, { search: name, take: 5 });
            const rows = result.data ?? [];
            return rows.find((row) => row.supplierName?.toLowerCase() === name.toLowerCase()) ?? null;
        }
        catch {
            return null;
        }
    }
    async findCustomer(user, name) {
        try {
            const result = await this.customers.list(user, { search: name, take: 5 });
            const rows = result.data ?? [];
            return rows.find((row) => row.customerName?.toLowerCase() === name.toLowerCase()) ?? null;
        }
        catch {
            return null;
        }
    }
};
exports.PartnerWriteToolsService = PartnerWriteToolsService;
exports.PartnerWriteToolsService = PartnerWriteToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_registry_1.ToolRegistry,
        task_executor_service_1.TaskExecutorService,
        agent_task_service_1.AgentTaskService,
        suppliers_service_1.SuppliersService,
        customers_service_1.CustomersService])
], PartnerWriteToolsService);
//# sourceMappingURL=partner-write-tools.service.js.map