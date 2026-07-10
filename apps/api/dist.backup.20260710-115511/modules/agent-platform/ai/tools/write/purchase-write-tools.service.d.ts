import { OnModuleInit } from '@nestjs/common';
import { ProductsService } from "../../../../products/products.service";
import { PurchaseOrdersService } from "../../../../purchase-orders/purchase-orders.service";
import { ShopsService } from "../../../../shops/shops.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class PurchaseWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly products;
    private readonly shops;
    private readonly purchaseOrders;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, products: ProductsService, shops: ShopsService, purchaseOrders: PurchaseOrdersService);
    onModuleInit(): void;
    private draftPurchaseOrder;
    private buildSummary;
    private resolveLine;
    private resolveShopId;
    private resolvePoDate;
    private shopName;
}
