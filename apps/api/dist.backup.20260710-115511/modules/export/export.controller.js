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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const skip_envelope_decorator_1 = require("../../common/decorators/skip-envelope.decorator");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const fs = require("fs/promises");
const path = require("path");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
let ExportController = class ExportController {
    exportsQueue;
    config;
    constructor(exportsQueue, config) {
        this.exportsQueue = exportsQueue;
        this.config = config;
    }
    async status(jobId) {
        const job = await this.exportsQueue.getJob(jobId);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        const state = await job.getState();
        const result = job.returnvalue;
        return { status: state, downloadUrl: result?.downloadUrl, fileName: result?.fileName };
    }
    async file(fileName, res) {
        const safe = path.basename(fileName);
        const dir = this.config.get('EXPORT_STORAGE_DIR', './storage/exports');
        const full = path.join(dir, safe);
        try {
            await fs.access(full);
        }
        catch {
            throw new common_1.NotFoundException('File not found');
        }
        res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
        return (0, fs_1.createReadStream)(full).pipe(res);
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "status", null);
__decorate([
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, common_1.Get)('files/:fileName'),
    __param(0, (0, common_1.Param)('fileName')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "file", null);
exports.ExportController = ExportController = __decorate([
    (0, swagger_1.ApiTags)('export'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('export'),
    __param(0, (0, bullmq_1.InjectQueue)('exports')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService])
], ExportController);
//# sourceMappingURL=export.controller.js.map