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
var QueueMetricsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueMetricsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const queue_service_1 = require("./queue.service");
let QueueMetricsController = QueueMetricsController_1 = class QueueMetricsController {
    queueService;
    logger = new common_1.Logger(QueueMetricsController_1.name);
    constructor(queueService) {
        this.queueService = queueService;
    }
    async getQueueStats() {
        try {
            const metrics = await this.queueService.getAllMetrics();
            return {
                success: true,
                data: {
                    metrics,
                    timestamp: new Date(),
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch queue stats: ${error.message}`);
            throw error;
        }
    }
    async getQueueStatsByName(queueName) {
        try {
            const metric = await this.queueService.getQueueMetrics(queueName);
            return {
                success: true,
                data: metric,
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch queue stats for ${queueName}: ${error.message}`);
            throw error;
        }
    }
    async getQueuesHealth() {
        try {
            const metrics = await this.queueService.getAllMetrics();
            const totalActive = metrics.reduce((sum, m) => sum + m.active, 0);
            const totalFailed = metrics.reduce((sum, m) => sum + m.failed, 0);
            const totalWaiting = metrics.reduce((sum, m) => sum + m.waiting, 0);
            return {
                success: true,
                data: {
                    status: totalFailed > 0 ? 'degraded' : 'healthy',
                    totalQueues: metrics.length,
                    totalActive,
                    totalFailed,
                    totalWaiting,
                    queues: metrics,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch queues health: ${error.message}`);
            throw error;
        }
    }
};
exports.QueueMetricsController = QueueMetricsController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QueueMetricsController.prototype, "getQueueStats", null);
__decorate([
    (0, common_1.Get)('stats/:queueName'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueMetricsController.prototype, "getQueueStatsByName", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QueueMetricsController.prototype, "getQueuesHealth", null);
exports.QueueMetricsController = QueueMetricsController = QueueMetricsController_1 = __decorate([
    (0, swagger_1.ApiTags)('queues'),
    (0, common_1.Controller)('queues'),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], QueueMetricsController);
//# sourceMappingURL=queue-metrics.controller.js.map