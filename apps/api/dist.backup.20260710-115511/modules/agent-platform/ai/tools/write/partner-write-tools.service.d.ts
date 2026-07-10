import { OnModuleInit } from '@nestjs/common';
import { CustomersService } from "../../../../customers/customers.service";
import { SuppliersService } from "../../../../suppliers/suppliers.service";
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry } from '../tool-registry';
export declare class PartnerWriteToolsService implements OnModuleInit {
    private readonly registry;
    private readonly executor;
    private readonly tasks;
    private readonly suppliers;
    private readonly customers;
    constructor(registry: ToolRegistry, executor: TaskExecutorService, tasks: AgentTaskService, suppliers: SuppliersService, customers: CustomersService);
    onModuleInit(): void;
    private draftSupplier;
    private draftCustomer;
    private findSupplier;
    private findCustomer;
}
