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
var PlatformCheckScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformCheckScheduler = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const platform_notification_constants_1 = require("./platform-notification.constants");
let PlatformCheckScheduler = PlatformCheckScheduler_1 = class PlatformCheckScheduler {
    queue;
    logger = new common_1.Logger(PlatformCheckScheduler_1.name);
    constructor(queue) {
        this.queue = queue;
    }
    async registerRepeatableJobs() {
        await this.queue.add('health-check', { kind: 'health-check' }, {
            repeat: { pattern: '*/5 * * * *' },
            jobId: 'platform-health-check',
            removeOnComplete: 20,
            removeOnFail: 20,
        });
        await this.queue.add('revenue-milestones', { kind: 'revenue-milestones' }, {
            repeat: { pattern: '0 6 * * *' },
            jobId: 'platform-revenue-milestones',
            removeOnComplete: 10,
            removeOnFail: 10,
        });
        this.logger.log('Scheduled platform check jobs (health every 5m, revenue milestones daily)');
    }
};
exports.PlatformCheckScheduler = PlatformCheckScheduler;
exports.PlatformCheckScheduler = PlatformCheckScheduler = PlatformCheckScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(platform_notification_constants_1.PLATFORM_CHECKS_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], PlatformCheckScheduler);
//# sourceMappingURL=platform-check.scheduler.js.map