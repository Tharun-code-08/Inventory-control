import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { CustomersService } from '@/modules/customers/customers.service';
import { InvoicesService } from '@/modules/invoices/invoices.service';
import { SalesOrdersService } from '@/modules/sales-orders/sales-orders.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_INVOICE = 'sales.create_invoice';

type InvoiceResult = { id?: string; invoiceNumber?: string; totalValue?: unknown };

type CustomerRow = {
  id: string;
  customerCode?: string;
  customerName?: string;
  shopId?: string | null;
};

type SalesOrderRow = {
  id: string;
  soNumber?: string;
  status?: string;
  shopId?: string;
  customerId?: string;
  totalValue?: unknown;
  customer?: { id: string; customerCode?: string | null; customerName?: string | null } | null;
};

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}

/**
 * Phase 3 write tools for invoicing. The tool NEVER creates the invoice: it
 * validates + resolves the request into a service-layer payload, stores it as
 * an AgentTask draft, and the user's explicit "approve" executes it through
 * InvoicesService with an idempotency key. UNLIKE the PO/SO/GR tools, the
 * approved document is not an ERP draft — InvoicesService.create ISSUES the
 * invoice immediately and auto-emails the customer when invoice emails are
 * enabled, so the draft summary warns the user before they approve.
 */
@Injectable()
export class InvoiceWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly customers: CustomersService,
    private readonly shops: ShopsService,
    private readonly salesOrders: SalesOrdersService,
    private readonly invoices: InvoicesService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_invoice',
      id: CREATE_INVOICE,
      description:
        'Draft a customer invoice for the user to approve. This does NOT create the invoice — it creates a ' +
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
      run: (user, payload, task, step) =>
        this.invoices.create(user, {
          ...(payload as never as Parameters<InvoicesService['create']>[1]),
          // Deterministic per step: a re-run after a transient failure returns
          // the already-issued invoice instead of issuing (and emailing) twice.
          idempotencyKey: `agent-task:${task.id}:${step.order}`,
        }),
      verify: (result) => {
        const invoice = result as InvoiceResult;
        if (!invoice?.id || !invoice?.invoiceNumber) {
          throw new Error('Invoice creation returned an unexpected result shape');
        }
      },
      describe: (result) => {
        const invoice = result as InvoiceResult;
        return (
          `✅ Invoice *${invoice.invoiceNumber}* issued (total ${money(invoice.totalValue)}). ` +
          'If invoice emails are enabled, the customer has been emailed a copy. Manage it under Invoices in the ERP.'
        );
      },
    });
  }

  private async draftInvoice(
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Invoice drafting is only available in a chat conversation');
    }

    const salesOrder = await this.resolveSalesOrder(ctx.user, input);
    if (salesOrder && 'clarify' in salesOrder) return salesOrder;

    // A linked SO pins the shop; otherwise fall back to the requested/user shop.
    const shopId = salesOrder?.shopId ?? this.resolveShopId(ctx.user, input.shop_id);

    let customerId: string;
    let customerLabel: string;
    if (salesOrder) {
      if (!salesOrder.customerId) throw new Error('The sales order has no customer to invoice');
      customerId = salesOrder.customerId;
      customerLabel = salesOrder.customer
        ? this.customerLabel(salesOrder.customer as CustomerRow)
        : salesOrder.customerId;
    } else {
      const customer = await this.resolveCustomer(ctx.user, shopId, input);
      if ('clarify' in customer) return customer; // model asks the user to disambiguate
      customerId = customer.id;
      customerLabel = this.customerLabel(customer);
    }

    const invoiceDate = this.resolveInvoiceDate(input.invoice_date);
    const dueDate =
      typeof input.due_date === 'string' && input.due_date.trim()
        ? this.resolveDueDate(input.due_date, invoiceDate)
        : undefined;

    let totalValue: number;
    if (input.total_value !== undefined && input.total_value !== null) {
      totalValue = Number(input.total_value);
    } else if (salesOrder) {
      totalValue = Number(salesOrder.totalValue);
    } else {
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

  private buildSummary(draft: {
    customerLabel: string;
    shopName: string;
    invoiceDate: string;
    dueDate?: string;
    soNumber?: string;
    totalValue: number;
    remarks?: string;
  }): string {
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

  /**
   * Resolve an optional linked sales order: by id via the scoped get(), or by
   * exact SO number against the most recent orders. Confirms it is in an
   * invoiceable state up-front so the user hears about problems before
   * approving, not as an execution failure (the service re-validates in-tx).
   */
  private async resolveSalesOrder(
    user: RequestUser,
    input: Record<string, unknown>,
  ): Promise<SalesOrderRow | { clarify: string; candidates?: unknown[] } | undefined> {
    let so: SalesOrderRow | undefined;
    if (typeof input.sales_order_id === 'string' && input.sales_order_id.trim()) {
      so = (await this.salesOrders.get(user, input.sales_order_id.trim())) as unknown as SalesOrderRow;
    } else if (typeof input.sales_order_number === 'string' && input.sales_order_number.trim()) {
      const query = input.sales_order_number.trim().toLowerCase();
      const found = await this.salesOrders.list(user, { take: 50 });
      const rows = ((found as { data?: unknown[] }).data ?? []) as SalesOrderRow[];
      so = rows.find((row) => row.soNumber?.toLowerCase() === query);
      if (!so) {
        return {
          clarify: `No recent sales order matches "${input.sales_order_number}". Ask the user for the exact SO number or id.`,
        };
      }
    } else {
      return undefined;
    }

    if (so.status === 'DRAFT' || so.status === 'CANCELLED') {
      return {
        clarify: `Sales order ${so.soNumber ?? so.id} is ${so.status} and cannot be invoiced. It must be confirmed first.`,
      };
    }
    return so;
  }

  private async resolveCustomer(
    user: RequestUser,
    shopId: string,
    input: Record<string, unknown>,
  ): Promise<CustomerRow | { clarify: string; candidates?: unknown[] }> {
    if (typeof input.customer_id === 'string' && input.customer_id.trim()) {
      // InvoicesService.create re-validates that the customer belongs to the shop.
      return { id: input.customer_id.trim() };
    }
    const query = String(input.customer_query ?? '').trim();
    if (!query) {
      throw new Error('customer_id, customer_query, or a sales order is required');
    }

    const found = await this.customers.list(user, { search: query, take: 5 });
    const candidates = ((found as { data?: unknown[] }).data ?? []) as CustomerRow[];
    const inShop = candidates.filter((c) => !c.shopId || c.shopId === shopId);
    if (inShop.length === 0) {
      return { clarify: `No customer matches "${query}". Ask the user for the exact customer name or code.` };
    }
    const exact = inShop.filter(
      (c) =>
        c.customerCode?.toLowerCase() === query.toLowerCase() ||
        c.customerName?.toLowerCase() === query.toLowerCase(),
    );
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

  private customerLabel(customer: CustomerRow): string {
    if (!customer.customerName) return customer.id;
    return `${customer.customerName}${customer.customerCode ? ` (${customer.customerCode})` : ''}`;
  }

  private resolveShopId(user: RequestUser, requested: unknown): string {
    const shopId =
      (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
    if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
    return shopId;
  }

  private resolveInvoiceDate(requested: unknown): string {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof requested !== 'string' || !requested.trim()) return today;
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invoice_date must be YYYY-MM-DD');
    if (date > today) throw new Error('invoice_date cannot be in the future');
    return date;
  }

  private resolveDueDate(requested: string, invoiceDate: string): string {
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('due_date must be YYYY-MM-DD');
    if (date < invoiceDate) throw new Error('due_date cannot be before the invoice date');
    return date;
  }

  private async shopName(user: RequestUser, shopId: string): Promise<string> {
    try {
      const result = await this.shops.list(user, {} as never);
      const rows = (result as { data?: Array<{ id: string; shopName?: string; name?: string }> }).data ?? [];
      const shop = rows.find((row) => row.id === shopId);
      return shop?.shopName ?? shop?.name ?? shopId;
    } catch {
      return shopId;
    }
  }
}
