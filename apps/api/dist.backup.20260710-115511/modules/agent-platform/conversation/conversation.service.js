"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ConversationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ai_orchestrator_service_1 = require("../ai/ai-orchestrator.service");
const intent_service_1 = require("../intent/intent.service");
const link_service_1 = require("../link/link.service");
const agent_task_service_1 = require("../tasks/agent-task.service");
const task_flow_service_1 = require("../tasks/task-flow.service");
const LINKED_REPLY = '✅ WhatsApp linked successfully.\n\nWelcome! ' +
    'Ask me about stock, sales, low stock, top sellers, or what to reorder — in plain language.';
const LINK_COMMAND_REGEX = /^LINK\s+((?:V1-)?[A-Z0-9]{6,12})$/i;
let ConversationService = ConversationService_1 = class ConversationService {
    prisma;
    links;
    intents;
    orchestrator;
    tasks;
    taskFlow;
    whatsappQueue;
    logger = new common_1.Logger(ConversationService_1.name);
    constructor(prisma, links, intents, orchestrator, tasks, taskFlow, whatsappQueue) {
        this.prisma = prisma;
        this.links = links;
        this.intents = intents;
        this.orchestrator = orchestrator;
        this.tasks = tasks;
        this.taskFlow = taskFlow;
        this.whatsappQueue = whatsappQueue;
    }
    async handleInboundText(inbound) {
        if (inbound.waMessageId) {
            const seen = await this.prisma.message.findUnique({
                where: { waMessageId: inbound.waMessageId },
                select: { id: true },
            });
            if (seen)
                return;
        }
        const link = await this.prisma.userChannelLink.findUnique({
            where: { channel_phoneNumber: { channel: client_1.ChatChannel.WHATSAPP, phoneNumber: inbound.from } },
        });
        if (!link || link.status !== client_1.ChannelLinkStatus.ACTIVE) {
            await this.handleUnlinkedNumber(inbound);
            return;
        }
        const conversation = await this.getOrCreateActiveConversation(link);
        const inboundMessage = await this.persistInbound(conversation, inbound);
        void this.links
            .touchLastSeen(link)
            .then(() => this.buildReply(link, conversation, inbound.text, inboundMessage.id))
            .then((reply) => this.queueOutbound(conversation, inbound.from, reply))
            .catch((err) => this.logger.error(`Conversation turn failed for link ${link.id}: ${err.message}`));
    }
    async buildReply(link, conversation, text, inboundMessageId) {
        const pending = await this.tasks.findPending(conversation.id);
        if (pending) {
            const decision = await this.taskFlow.handleDecision(link, pending, text);
            if (decision)
                return decision;
            const reply = await this.orchestrator.respond(link, conversation, text, inboundMessageId, pending);
            return reply === ai_orchestrator_service_1.REPLIES.notConfigured ? this.taskFlow.pendingReminder(pending) : reply;
        }
        return (this.intents.match(text) ??
            (await this.orchestrator.respond(link, conversation, text, inboundMessageId)));
    }
    async queueOutbound(conversation, to, body) {
        void to;
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: client_1.MessageDirection.OUT,
                body,
                status: client_1.ChatMessageStatus.QUEUED,
            },
        });
        await this.whatsappQueue.add('send-text', { messageId: message.id });
    }
    async handleUnlinkedNumber(inbound) {
        const match = LINK_COMMAND_REGEX.exec(inbound.text.trim());
        if (!match) {
            this.logger.debug(`Ignoring message from unlinked number ending ${inbound.from.slice(-4)}`);
            return;
        }
        const result = await this.links.redeemLinkToken(inbound.from, match[1]);
        if (!result) {
            this.logger.debug(`Rejected LINK attempt from number ending ${inbound.from.slice(-4)}`);
            return;
        }
        const conversation = await this.getOrCreateActiveConversation(result.link);
        await this.persistInbound(conversation, inbound);
        await this.queueOutbound(conversation, inbound.from, LINKED_REPLY);
    }
    async getOrCreateActiveConversation(link) {
        const existing = await this.prisma.conversation.findFirst({
            where: { userChannelLinkId: link.id, status: client_1.ConversationStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data: { companyId: link.companyId, userChannelLinkId: link.id },
        });
    }
    async persistInbound(conversation, inbound) {
        const [message] = await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: client_1.MessageDirection.IN,
                    waMessageId: inbound.waMessageId || null,
                    body: inbound.text,
                    status: client_1.ChatMessageStatus.RECEIVED,
                },
            }),
            this.prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: inbound.timestamp ?? new Date() },
            }),
        ]);
        return message;
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = ConversationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, bullmq_1.InjectQueue)('whatsapp')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        link_service_1.LinkService,
        intent_service_1.IntentService,
        ai_orchestrator_service_1.AiOrchestratorService,
        agent_task_service_1.AgentTaskService,
        task_flow_service_1.TaskFlowService,
        bullmq_2.Queue])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map