import { OnModuleInit } from '@nestjs/common';
import { DamagedStockService } from "../../../../damaged-stock/damaged-stock.service";
import { ProductsService } from "../../../../products/products.service";
import { ShopsService } from "../../../../shops/shops.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class InventoryWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly products;
    private readonly shops;
    private readonly damaged;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, products: ProductsService, shops: ShopsService, damaged: DamagedStockService);
    onModuleInit(): void;
    private draftWriteOff;
    private findByMarker;
    private resolveProduct;
    private label;
    private resolveShopId;
    private shopName;
}
