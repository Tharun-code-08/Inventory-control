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
var SubscriptionLifecycleScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionLifecycleScheduler = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const subscription_lifecycle_constants_1 = require("./subscription-lifecycle.constants");
let SubscriptionLifecycleScheduler = SubscriptionLifecycleScheduler_1 = class SubscriptionLifecycleScheduler {
    queue;
    logger = new common_1.Logger(SubscriptionLifecycleScheduler_1.name);
    constructor(queue) {
        this.queue = queue;
    }
    async registerRepeatableJob() {
        await this.queue.add('daily-subscription-lifecycle', {}, {
            repeat: { pattern: '0 9 * * *' },
            jobId: 'daily-subscription-lifecycle',
            removeOnComplete: 20,
            removeOnFail: 20,
        });
        this.logger.log('Scheduled daily subscription lifecycle job (09:00 UTC)');
    }
};
exports.SubscriptionLifecycleScheduler = SubscriptionLifecycleScheduler;
exports.SubscriptionLifecycleScheduler = SubscriptionLifecycleScheduler = SubscriptionLifecycleScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(subscription_lifecycle_constants_1.SUBSCRIPTION_LIFECYCLE_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], SubscriptionLifecycleScheduler);
//# sourceMappingURL=subscription-lifecycle.scheduler.js.map