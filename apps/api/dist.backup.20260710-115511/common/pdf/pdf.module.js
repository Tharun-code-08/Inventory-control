"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../../prisma/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const queue_module_1 = require("../queue/queue.module");
const branding_module_1 = require("../branding/branding.module");
const pdf_cluster_service_1 = require("./pdf-cluster.service");
const pdf_renderer_service_1 = require("./pdf-renderer.service");
const pdf_worker_processor_1 = require("./pdf-worker.processor");
const document_pdf_service_1 = require("./document-pdf.service");
const pdf_health_controller_1 = require("./pdf-health.controller");
let PdfModule = class PdfModule {
};
exports.PdfModule = PdfModule;
exports.PdfModule = PdfModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, storage_module_1.StorageModule, queue_module_1.QueueModule, branding_module_1.BrandingModule],
        providers: [pdf_cluster_service_1.PdfClusterService, pdf_renderer_service_1.PdfRendererService, pdf_worker_processor_1.PdfWorkerProcessor, document_pdf_service_1.DocumentPdfService],
        controllers: [pdf_health_controller_1.PdfHealthController],
        exports: [pdf_cluster_service_1.PdfClusterService, pdf_renderer_service_1.PdfRendererService, pdf_worker_processor_1.PdfWorkerProcessor, document_pdf_service_1.DocumentPdfService],
    })
], PdfModule);
//# sourceMappingURL=pdf.module.js.map