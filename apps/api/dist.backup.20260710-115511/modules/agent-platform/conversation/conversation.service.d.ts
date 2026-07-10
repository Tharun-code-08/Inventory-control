import { type Conversation } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from "../../../prisma/prisma.service";
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';
import { IntentService } from '../intent/intent.service';
import { LinkService } from '../link/link.service';
import { AgentTaskService } from '../tasks/agent-task.service';
import { TaskFlowService } from '../tasks/task-flow.service';
export type InboundText = {
    waMessageId: string;
    from: string;
    text: string;
    timestamp?: Date;
};
export type WhatsAppSendJob = {
    messageId: string;
};
export declare class ConversationService {
    private readonly prisma;
    private readonly links;
    private readonly intents;
    private readonly orchestrator;
    private readonly tasks;
    private readonly taskFlow;
    private readonly whatsappQueue;
    private readonly logger;
    constructor(prisma: PrismaService, links: LinkService, intents: IntentService, orchestrator: AiOrchestratorService, tasks: AgentTaskService, taskFlow: TaskFlowService, whatsappQueue: Queue<WhatsAppSendJob>);
    handleInboundText(inbound: InboundText): Promise<void>;
    private buildReply;
    queueOutbound(conversation: Conversation, to: string, body: string): Promise<void>;
    private handleUnlinkedNumber;
    private getOrCreateActiveConversation;
    private persistInbound;
}
