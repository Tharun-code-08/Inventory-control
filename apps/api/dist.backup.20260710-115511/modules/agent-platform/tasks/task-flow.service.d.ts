import type { UserChannelLink } from '@prisma/client';
import { LinkService } from '../link/link.service';
import { ToolRegistry } from '../ai/tools/tool-registry';
import { AgentTaskService, type AgentTaskWithSteps } from './agent-task.service';
import { TaskExecutorService } from './task-executor.service';
export declare const TASK_REPLIES: {
    readonly accountInactive: "Your ERP account linked to this number is no longer active. Please contact your administrator.";
    readonly alreadyDecided: (n: number) => string;
    readonly cancelled: (n: number) => string;
    readonly permissionLost: (n: number, permission: string) => string;
    readonly failed: (n: number, reason: string) => string;
};
export declare class TaskFlowService {
    private readonly links;
    private readonly tasks;
    private readonly executor;
    private readonly registry;
    private readonly logger;
    constructor(links: LinkService, tasks: AgentTaskService, executor: TaskExecutorService, registry: ToolRegistry);
    handleDecision(link: UserChannelLink, task: AgentTaskWithSteps, text: string): Promise<string | null>;
    pendingReminder(task: AgentTaskWithSteps): string;
    private approve;
}
