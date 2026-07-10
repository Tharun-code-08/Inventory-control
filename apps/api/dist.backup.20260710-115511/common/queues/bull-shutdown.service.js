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
var BullShutdownService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullShutdownService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const core_1 = require("@nestjs/core");
let BullShutdownService = BullShutdownService_1 = class BullShutdownService {
    moduleRef;
    queueNames;
    logger = new common_1.Logger(BullShutdownService_1.name);
    constructor(moduleRef, queueNames = null) {
        this.moduleRef = moduleRef;
        this.queueNames = queueNames;
    }
    async beforeApplicationShutdown(signal) {
        const names = this.queueNames ?? [];
        if (names.length === 0)
            return;
        this.logger.log(`Closing ${names.length} BullMQ queue(s) on ${signal ?? 'shutdown'}`);
        await Promise.all(names.map(async (name) => {
            try {
                const queue = this.moduleRef.get((0, bullmq_1.getQueueToken)(name), { strict: false });
                await queue.close();
            }
            catch (err) {
                this.logger.warn(`Failed to close queue ${name}: ${err?.message ?? 'unknown'}`);
            }
        }));
    }
};
exports.BullShutdownService = BullShutdownService;
exports.BullShutdownService = BullShutdownService = BullShutdownService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)('BULL_QUEUE_NAMES')),
    __metadata("design:paramtypes", [core_1.ModuleRef, Object])
], BullShutdownService);
//# sourceMappingURL=bull-shutdown.service.js.map