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
var TaskFlowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskFlowService = exports.TASK_REPLIES = void 0;
const common_1 = require("@nestjs/common");
const link_service_1 = require("../link/link.service");
const tool_registry_1 = require("../ai/tools/tool-registry");
const approval_1 = require("./approval");
const agent_task_service_1 = require("./agent-task.service");
const task_executor_service_1 = require("./task-executor.service");
exports.TASK_REPLIES = {
    accountInactive: 'Your ERP account linked to this number is no longer active. Please contact your administrator.',
    alreadyDecided: (n) => `Task #${n} was already processed — nothing left to approve. Ask me for the latest status if unsure.`,
    cancelled: (n) => `🗑️ Task #${n} cancelled. Nothing was created.`,
    permissionLost: (n, permission) => `⛔ Task #${n} cannot be executed: your account no longer has the required permission (${permission}). The draft was cancelled.`,
    failed: (n, reason) => `❌ Task #${n} failed: ${reason}\nNothing was created — you can ask me to draft it again.`,
};
let TaskFlowService = TaskFlowService_1 = class TaskFlowService {
    links;
    tasks;
    executor;
    registry;
    logger = new common_1.Logger(TaskFlowService_1.name);
    constructor(links, tasks, executor, registry) {
        this.links = links;
        this.tasks = tasks;
        this.executor = executor;
        this.registry = registry;
    }
    async handleDecision(link, task, text) {
        const decision = (0, approval_1.parseDecision)(text);
        if (decision === 'approve')
            return this.approve(link, task);
        if (decision === 'reject') {
            const cancelled = await this.tasks.cancel(task.id, 'Rejected by user');
            return cancelled ? exports.TASK_REPLIES.cancelled(task.taskNumber) : exports.TASK_REPLIES.alreadyDecided(task.taskNumber);
        }
        return null;
    }
    pendingReminder(task) {
        return `⏳ Task #${task.taskNumber} is waiting for your decision:\n\n${task.summary}`;
    }
    async approve(link, task) {
        const user = await this.links.buildRequestUser(link);
        if (!user)
            return exports.TASK_REPLIES.accountInactive;
        const tool = this.registry.get(task.type);
        const permission = tool?.requiredPermission;
        if (permission && !user.permissions.includes(permission)) {
            await this.tasks.cancel(task.id, `Permission ${permission} missing at approval`);
            return exports.TASK_REPLIES.permissionLost(task.taskNumber, permission);
        }
        const transitioned = await this.tasks.approveTransition(task.id, user.id);
        if (!transitioned)
            return exports.TASK_REPLIES.alreadyDecided(task.taskNumber);
        const outcome = await this.executor.execute(user, task);
        if (!outcome.ok) {
            await this.tasks.fail(task.id, outcome.error);
            return exports.TASK_REPLIES.failed(task.taskNumber, outcome.error);
        }
        await this.tasks.complete(task.id, outcome.result);
        return outcome.reply;
    }
};
exports.TaskFlowService = TaskFlowService;
exports.TaskFlowService = TaskFlowService = TaskFlowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [link_service_1.LinkService,
        agent_task_service_1.AgentTaskService,
        task_executor_service_1.TaskExecutorService,
        tool_registry_1.ToolRegistry])
], TaskFlowService);
//# sourceMappingURL=task-flow.service.js.map