import { type AgentTask, type AgentTaskStep } from '@prisma/client';
import { PrismaService } from "../../../prisma/prisma.service";
export type AgentTaskWithSteps = AgentTask & {
    steps: AgentTaskStep[];
};
export type CreateDraftInput = {
    companyId: string;
    conversationId: string;
    requestedById: string;
    type: string;
    payload: Record<string, unknown>;
    summary: string;
    steps: string[];
};
export declare class AgentTaskService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createDraft(input: CreateDraftInput): Promise<AgentTaskWithSteps>;
    findPending(conversationId: string): Promise<AgentTaskWithSteps | null>;
    approveTransition(taskId: string, approvedById: string): Promise<boolean>;
    cancel(taskId: string, reason: string): Promise<boolean>;
    complete(taskId: string, result: unknown): Promise<void>;
    fail(taskId: string, reason: string): Promise<void>;
}
