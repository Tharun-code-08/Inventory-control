import type { RequestUser } from "../../../../common/types/request-user";
import type { AiToolDef } from '../provider/ai-provider.interface';
export type AgentToolContext = Readonly<{
    user: RequestUser;
    companyId?: string;
    conversationId?: string;
    linkId?: string;
}>;
export type AgentFeatureFlag = 'stock' | 'sales' | 'purchase';
export type AgentTool = {
    name: string;
    id?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    requiredPermission?: string;
    featureFlag: AgentFeatureFlag;
    version?: number;
    confirmationRequired?: boolean;
    costLevel?: 'low' | 'medium' | 'high';
    auditRequired?: boolean;
    handler: (ctx: AgentToolContext, input: Record<string, unknown>) => Promise<unknown>;
};
export declare class ToolRegistry {
    private readonly logger;
    private readonly tools;
    private readonly byId;
    register(tool: AgentTool): void;
    get(nameOrId: string): AgentTool | undefined;
    listFor(user: RequestUser, featureFlags: Record<string, boolean>): AgentTool[];
    toDefs(tools: AgentTool[]): AiToolDef[];
}
