import { OnModuleInit } from '@nestjs/common';
import { ProductsService } from "../../../../products/products.service";
import { ShopsService } from "../../../../shops/shops.service";
import { StockTransfersService } from "../../../../stock-transfers/stock-transfers.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class StockTransferWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly products;
    private readonly shops;
    private readonly stockTransfers;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, products: ProductsService, shops: ShopsService, stockTransfers: StockTransfersService);
    onModuleInit(): void;
    private draftStockTransfer;
    private buildSummary;
    private loadShops;
    private resolveShop;
    private shopLabel;
    private resolveLine;
    private resolveTransferDate;
}
