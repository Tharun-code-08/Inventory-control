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
var PlatformCheckProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformCheckProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const platform_notification_constants_1 = require("./platform-notification.constants");
const platform_health_service_1 = require("./platform-health.service");
const platform_revenue_service_1 = require("./platform-revenue.service");
let PlatformCheckProcessor = PlatformCheckProcessor_1 = class PlatformCheckProcessor extends bullmq_1.WorkerHost {
    health;
    revenue;
    logger = new common_1.Logger(PlatformCheckProcessor_1.name);
    constructor(health, revenue) {
        super();
        this.health = health;
        this.revenue = revenue;
    }
    async process(job) {
        const kind = job.data?.kind ?? job.name;
        if (kind === 'health-check') {
            return this.health.runHealthChecks();
        }
        if (kind === 'revenue-milestones') {
            return this.revenue.checkRevenueMilestones();
        }
        this.logger.warn(`Unknown platform check job: ${kind}`);
        return { skipped: true };
    }
};
exports.PlatformCheckProcessor = PlatformCheckProcessor;
exports.PlatformCheckProcessor = PlatformCheckProcessor = PlatformCheckProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(platform_notification_constants_1.PLATFORM_CHECKS_QUEUE),
    __metadata("design:paramtypes", [platform_health_service_1.PlatformHealthService,
        platform_revenue_service_1.PlatformRevenueService])
], PlatformCheckProcessor);
//# sourceMappingURL=platform-check.processor.js.map