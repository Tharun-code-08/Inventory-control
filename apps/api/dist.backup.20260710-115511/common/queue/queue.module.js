"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../../prisma/prisma.module");
const queue_config_1 = require("./queue.config");
const queue_service_1 = require("./queue.service");
const job_tracker_service_1 = require("./job-tracker.service");
const queue_metrics_controller_1 = require("./queue-metrics.controller");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule],
        providers: [queue_config_1.QueueConfig, queue_service_1.QueueService, job_tracker_service_1.JobTrackerService],
        controllers: [queue_metrics_controller_1.QueueMetricsController],
        exports: [queue_service_1.QueueService, queue_config_1.QueueConfig, job_tracker_service_1.JobTrackerService],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map