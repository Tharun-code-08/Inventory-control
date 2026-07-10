"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = exports.REGISTERED_QUEUES = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const bull_shutdown_service_1 = require("./bull-shutdown.service");
const job_failure_service_1 = require("./job-failure.service");
exports.REGISTERED_QUEUES = ['exports', 'notifications', 'whatsapp'];
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            job_failure_service_1.JobFailureService,
            bull_shutdown_service_1.BullShutdownService,
            { provide: 'BULL_QUEUE_NAMES', useValue: [...exports.REGISTERED_QUEUES] },
        ],
        exports: [job_failure_service_1.JobFailureService, bull_shutdown_service_1.BullShutdownService],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map