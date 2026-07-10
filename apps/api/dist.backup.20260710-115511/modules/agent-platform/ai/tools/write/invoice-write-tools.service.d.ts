import { OnModuleInit } from '@nestjs/common';
import { CustomersService } from "../../../../customers/customers.service";
import { InvoicesService } from "../../../../invoices/invoices.service";
import { SalesOrdersService } from "../../../../sales-orders/sales-orders.service";
import { ShopsService } from "../../../../shops/shops.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class InvoiceWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly customers;
    private readonly shops;
    private readonly salesOrders;
    private readonly invoices;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, customers: CustomersService, shops: ShopsService, salesOrders: SalesOrdersService, invoices: InvoicesService);
    onModuleInit(): void;
    private draftInvoice;
    private buildSummary;
    private resolveSalesOrder;
    private resolveCustomer;
    private customerLabel;
    private resolveShopId;
    private resolveInvoiceDate;
    private resolveDueDate;
    private shopName;
}
