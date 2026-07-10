import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { CustomersService } from '@/modules/customers/customers.service';
import { SuppliersService } from '@/modules/suppliers/suppliers.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_SUPPLIER = 'partner.create_supplier';
const CREATE_CUSTOMER = 'partner.create_customer';

type PartnerRow = {
  id?: string;
  supplierCode?: string;
  supplierName?: string;
  customerCode?: string;
  customerName?: string;
  phone?: string;
  email?: string;
};

type SupplierPayload = {
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  taxId?: string;
};

type CustomerPayload = {
  customerName: string;
  phone?: string;
  email?: string;
  city?: string;
  taxId?: string;
};

function optional(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Phase 3 write tools for business partners (suppliers & customers). Both
 * draft an AgentTask; "approve" executes through the same services as the
 * REST API (tenant scope, code generation, AuditLog). Idempotency: before
 * drafting AND before executing, an exact-name match short-circuits to the
 * existing record instead of creating a duplicate.
 */
@Injectable()
export class PartnerWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly suppliers: SuppliersService,
    private readonly customers: CustomersService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_supplier',
      id: CREATE_SUPPLIER,
      description:
        'Draft a new supplier/vendor for the user to approve. This does NOT create it — the user must reply ' +
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
      description:
        'Draft a new customer for the user to approve. This does NOT create it — the user must reply "approve" ' +
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
        const dto = payload as SupplierPayload;
        const existing = await this.findSupplier(user, dto.supplierName);
        if (existing) return existing;
        return this.suppliers.create(user, dto as never);
      },
      verify: (result) => {
        const row = result as PartnerRow;
        if (!row?.id) throw new Error('Supplier creation returned an unexpected result shape');
      },
      describe: (result) => {
        const row = result as PartnerRow;
        return `✅ Supplier *${row.supplierName}*${row.supplierCode ? ` (${row.supplierCode})` : ''} created. You can now raise POs against them.`;
      },
    });

    this.executor.registerRunner({
      name: CREATE_CUSTOMER,
      run: async (user, payload) => {
        const dto = payload as CustomerPayload;
        const existing = await this.findCustomer(user, dto.customerName);
        if (existing) return existing;
        return this.customers.create(user, dto as never);
      },
      verify: (result) => {
        const row = result as PartnerRow;
        if (!row?.id) throw new Error('Customer creation returned an unexpected result shape');
      },
      describe: (result) => {
        const row = result as PartnerRow;
        return `✅ Customer *${row.customerName}*${row.customerCode ? ` (${row.customerCode})` : ''} created. You can now raise sales orders and invoices for them.`;
      },
    });
  }

  private async draftSupplier(ctx: AgentToolContext, input: Record<string, unknown>): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Supplier drafting is only available in a chat conversation');
    }
    const name = String(input.name ?? '').trim();
    if (!name) throw new Error('name is required');

    const existing = await this.findSupplier(ctx.user, name);
    if (existing) {
      return {
        clarify: `A supplier named "${existing.supplierName}" already exists${existing.supplierCode ? ` (${existing.supplierCode})` : ''}. Tell the user — they may not need to create it again.`,
      };
    }

    const payload: SupplierPayload = {
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

  private async draftCustomer(ctx: AgentToolContext, input: Record<string, unknown>): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Customer drafting is only available in a chat conversation');
    }
    const name = String(input.name ?? '').trim();
    if (!name) throw new Error('name is required');

    const existing = await this.findCustomer(ctx.user, name);
    if (existing) {
      return {
        clarify: `A customer named "${existing.customerName}" already exists${existing.customerCode ? ` (${existing.customerCode})` : ''}. Tell the user — they may not need to create it again.`,
      };
    }

    const payload: CustomerPayload = {
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

  private async findSupplier(user: RequestUser, name: string): Promise<PartnerRow | null> {
    try {
      const result = await this.suppliers.list(user, { search: name, take: 5 });
      const rows = (result as { data?: PartnerRow[] }).data ?? [];
      return rows.find((row) => row.supplierName?.toLowerCase() === name.toLowerCase()) ?? null;
    } catch {
      return null;
    }
  }

  private async findCustomer(user: RequestUser, name: string): Promise<PartnerRow | null> {
    try {
      const result = await this.customers.list(user, { search: name, take: 5 } as never);
      const rows = (result as { data?: PartnerRow[] }).data ?? [];
      return rows.find((row) => row.customerName?.toLowerCase() === name.toLowerCase()) ?? null;
    } catch {
      return null;
    }
  }
}
