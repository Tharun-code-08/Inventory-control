import { OnModuleInit } from '@nestjs/common';
import { ProductsService } from "../../../../products/products.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class CatalogWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly products;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, products: ProductsService);
    onModuleInit(): void;
    private draftCreateProduct;
    private draftUpdateProduct;
    private findByCode;
    private resolveProduct;
    private resolveShopId;
}
