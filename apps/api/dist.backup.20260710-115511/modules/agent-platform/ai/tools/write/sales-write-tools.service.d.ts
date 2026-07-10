import { OnModuleInit } from '@nestjs/common';
import { CustomersService } from "../../../../customers/customers.service";
import { ProductsService } from "../../../../products/products.service";
import { SalesOrdersService } from "../../../../sales-orders/sales-orders.service";
import { ShopsService } from "../../../../shops/shops.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class SalesWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly products;
    private readonly customers;
    private readonly shops;
    private readonly salesOrders;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, products: ProductsService, customers: CustomersService, shops: ShopsService, salesOrders: SalesOrdersService);
    onModuleInit(): void;
    private draftSalesOrder;
    private buildSummary;
    private resolveCustomer;
    private customerLabel;
    private resolveLine;
    private resolveShopId;
    private resolveDate;
    private shopName;
}
