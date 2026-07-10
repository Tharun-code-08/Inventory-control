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
var PdfHealthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfHealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pdf_cluster_service_1 = require("./pdf-cluster.service");
let PdfHealthController = PdfHealthController_1 = class PdfHealthController {
    pdfCluster;
    logger = new common_1.Logger(PdfHealthController_1.name);
    constructor(pdfCluster) {
        this.pdfCluster = pdfCluster;
    }
    async getPdfHealth() {
        try {
            const metrics = this.pdfCluster.getMetrics();
            return {
                success: true,
                data: {
                    status: metrics.failedRenders > 0 ? 'degraded' : 'healthy',
                    cluster: {
                        activeBrowsers: metrics.activeBrowsers,
                        activePages: metrics.activePages,
                        queuedTasks: metrics.queuedTasks,
                        successfulRenders: metrics.successfulRenders,
                        failedRenders: metrics.failedRenders,
                        avgRenderTimeMs: Math.round(metrics.avgRenderTime),
                        memoryMB: metrics.memoryUsageMB,
                        browserRestarts: metrics.browserRestarts,
                    },
                    timestamp: new Date(),
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch PDF health: ${error.message}`);
            throw error;
        }
    }
};
exports.PdfHealthController = PdfHealthController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PdfHealthController.prototype, "getPdfHealth", null);
exports.PdfHealthController = PdfHealthController = PdfHealthController_1 = __decorate([
    (0, swagger_1.ApiTags)('pdf'),
    (0, common_1.Controller)('pdf'),
    __metadata("design:paramtypes", [pdf_cluster_service_1.PdfClusterService])
], PdfHealthController);
//# sourceMappingURL=pdf-health.controller.js.map