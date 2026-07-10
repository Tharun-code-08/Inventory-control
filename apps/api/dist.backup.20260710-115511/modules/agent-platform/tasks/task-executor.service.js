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
var TaskExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutorService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
let TaskExecutorService = TaskExecutorService_1 = class TaskExecutorService {
    prisma;
    logger = new common_1.Logger(TaskExecutorService_1.name);
    runners = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    registerRunner(runner) {
        if (this.runners.has(runner.name)) {
            throw new Error(`Task step runner "${runner.name}" is already registered`);
        }
        this.runners.set(runner.name, runner);
        this.logger.log(`Registered task step runner ${runner.name}`);
    }
    async execute(user, task) {
        const payload = (task.payload ?? {});
        let reply = '';
        let lastResult = null;
        for (const step of [...task.steps].sort((a, b) => a.order - b.order)) {
            if (step.status === client_1.AgentTaskStepStatus.COMPLETED)
                continue;
            const runner = this.runners.get(step.name);
            if (!runner) {
                const error = `No runner registered for step "${step.name}"`;
                await this.markStep(step.id, client_1.AgentTaskStepStatus.FAILED, { error });
                return { ok: false, error };
            }
            await this.prisma.agentTaskStep.update({
                where: { id: step.id },
                data: {
                    status: client_1.AgentTaskStepStatus.RUNNING,
                    attempts: { increment: 1 },
                    startedAt: new Date(),
                },
            });
            try {
                const result = await runner.run(user, payload, task, step);
                runner.verify(result);
                await this.markStep(step.id, client_1.AgentTaskStepStatus.COMPLETED, { result });
                lastResult = result;
                reply = runner.describe(result);
            }
            catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Task ${task.id} step ${step.name} failed: ${error}`);
                await this.markStep(step.id, client_1.AgentTaskStepStatus.FAILED, { error });
                return { ok: false, error };
            }
        }
        return { ok: true, reply, result: lastResult };
    }
    async markStep(stepId, status, data) {
        await this.prisma.agentTaskStep.update({
            where: { id: stepId },
            data: {
                status,
                ...(data.result !== undefined ? { result: data.result } : {}),
                ...(data.error ? { error: data.error.slice(0, 500) } : {}),
                completedAt: new Date(),
            },
        });
    }
};
exports.TaskExecutorService = TaskExecutorService;
exports.TaskExecutorService = TaskExecutorService = TaskExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaskExecutorService);
//# sourceMappingURL=task-executor.service.js.map