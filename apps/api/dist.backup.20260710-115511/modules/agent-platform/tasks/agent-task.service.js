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
var AgentTaskService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTaskService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
let AgentTaskService = AgentTaskService_1 = class AgentTaskService {
    prisma;
    logger = new common_1.Logger(AgentTaskService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDraft(input) {
        return this.prisma.$transaction(async (tx) => {
            const task = await tx.agentTask.create({
                data: {
                    companyId: input.companyId,
                    conversationId: input.conversationId,
                    requestedById: input.requestedById,
                    type: input.type,
                    status: client_1.AgentTaskStatus.WAITING_APPROVAL,
                    payload: input.payload,
                    summary: input.summary,
                    steps: {
                        create: input.steps.map((name, index) => ({ name, order: index + 1 })),
                    },
                },
                include: { steps: { orderBy: { order: 'asc' } } },
            });
            await tx.agentTask.updateMany({
                where: {
                    conversationId: input.conversationId,
                    status: client_1.AgentTaskStatus.WAITING_APPROVAL,
                    id: { not: task.id },
                },
                data: {
                    status: client_1.AgentTaskStatus.CANCELLED,
                    failureReason: `Superseded by task #${task.taskNumber}`,
                },
            });
            return task;
        });
    }
    async findPending(conversationId) {
        return this.prisma.agentTask.findFirst({
            where: { conversationId, status: client_1.AgentTaskStatus.WAITING_APPROVAL },
            orderBy: { createdAt: 'desc' },
            include: { steps: { orderBy: { order: 'asc' } } },
        });
    }
    async approveTransition(taskId, approvedById) {
        const { count } = await this.prisma.agentTask.updateMany({
            where: { id: taskId, status: client_1.AgentTaskStatus.WAITING_APPROVAL },
            data: {
                status: client_1.AgentTaskStatus.RUNNING,
                approvedById,
                approvedAt: new Date(),
            },
        });
        return count === 1;
    }
    async cancel(taskId, reason) {
        const { count } = await this.prisma.agentTask.updateMany({
            where: { id: taskId, status: client_1.AgentTaskStatus.WAITING_APPROVAL },
            data: { status: client_1.AgentTaskStatus.CANCELLED, failureReason: reason },
        });
        return count === 1;
    }
    async complete(taskId, result) {
        await this.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: client_1.AgentTaskStatus.COMPLETED,
                result: result,
                completedAt: new Date(),
            },
        });
    }
    async fail(taskId, reason) {
        await this.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: client_1.AgentTaskStatus.FAILED,
                failureReason: reason.slice(0, 500),
                completedAt: new Date(),
            },
        });
    }
};
exports.AgentTaskService = AgentTaskService;
exports.AgentTaskService = AgentTaskService = AgentTaskService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentTaskService);
//# sourceMappingURL=agent-task.service.js.map