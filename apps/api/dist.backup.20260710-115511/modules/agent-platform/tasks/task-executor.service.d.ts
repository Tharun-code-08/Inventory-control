import { type AgentTask, type AgentTaskStep } from '@prisma/client';
import type { RequestUser } from "../../../common/types/request-user";
import { PrismaService } from "../../../prisma/prisma.service";
export type TaskStepRunner = {
    name: string;
    run: (user: RequestUser, payload: Record<string, unknown>, task: AgentTask, step: AgentTaskStep) => Promise<unknown>;
    verify: (result: unknown) => void;
    describe: (result: unknown) => string;
};
export type ExecutionOutcome = {
    ok: true;
    reply: string;
    result: unknown;
} | {
    ok: false;
    error: string;
};
export declare class TaskExecutorService {
    private readonly prisma;
    private readonly logger;
    private readonly runners;
    constructor(prisma: PrismaService);
    registerRunner(runner: TaskStepRunner): void;
    execute(user: RequestUser, task: AgentTask & {
        steps: AgentTaskStep[];
    }): Promise<ExecutionOutcome>;
    private markStep;
}
