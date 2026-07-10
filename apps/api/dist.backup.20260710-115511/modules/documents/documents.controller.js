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
var DocumentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const common_2 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const document_pdf_types_1 = require("../../common/pdf/document-pdf.types");
const document_email_service_1 = require("../document-email/document-email.service");
const document_email_constants_1 = require("../document-email/document-email.constants");
let DocumentsController = DocumentsController_1 = class DocumentsController {
    documentPdf;
    documentEmail;
    logger = new common_1.Logger(DocumentsController_1.name);
    constructor(documentPdf, documentEmail) {
        this.documentPdf = documentPdf;
        this.documentEmail = documentEmail;
    }
    async downloadPdf(user, kind, id, res) {
        try {
            this.logger.log(`PDF request: kind=${kind}, id=${id}, user=${user.id}`);
            if (!(0, document_pdf_types_1.isDocumentPdfKind)(kind)) {
                throw new common_2.BadRequestException(`Unsupported document kind: ${kind}`);
            }
            this.logger.log(`Rendering PDF for ${kind}:${id}`);
            const result = await this.documentPdf.renderPdf(user, kind, id);
            this.logger.log(`PDF rendered successfully: ${result.filename}`);
            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="${result.filename}"`,
                'Content-Length': result.buffer.length,
            });
            res.send(result.buffer);
        }
        catch (error) {
            this.logger.error(`PDF generation failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async emailHistory(user, kind, id) {
        if (!(0, document_pdf_types_1.isDocumentPdfKind)(kind)) {
            throw new common_2.BadRequestException(`Unsupported document kind: ${kind}`);
        }
        await this.documentPdf.assertDocumentAccess(user, kind, id);
        const entityType = document_email_constants_1.DOCUMENT_KIND_TO_ENTITY[kind] ?? kind;
        const [history, summary] = await Promise.all([
            this.documentEmail.listHistory(entityType, id),
            this.documentEmail.getLatestSummary(entityType, id),
        ]);
        return { data: { history, summary } };
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(':kind/:id/pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Get)(':kind/:id/email-history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "emailHistory", null);
exports.DocumentsController = DocumentsController = DocumentsController_1 = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [document_pdf_service_1.DocumentPdfService,
        document_email_service_1.DocumentEmailService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map