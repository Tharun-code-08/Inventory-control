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
var DocumentEmailProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentEmailProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const document_email_constants_1 = require("./document-email.constants");
const document_email_service_1 = require("./document-email.service");
let DocumentEmailProcessor = DocumentEmailProcessor_1 = class DocumentEmailProcessor extends bullmq_1.WorkerHost {
    documentEmail;
    logger = new common_1.Logger(DocumentEmailProcessor_1.name);
    constructor(documentEmail) {
        super();
        this.documentEmail = documentEmail;
    }
    async process(job) {
        const { outboxId } = job.data;
        try {
            await this.documentEmail.processOutbox(outboxId);
            return { ok: true, outboxId };
        }
        catch (err) {
            const message = err.message ?? 'Retry failed';
            await this.documentEmail.scheduleBackgroundRetry(outboxId, message);
            this.logger.warn(`Document email retry failed for ${outboxId}: ${message}`);
            return { ok: false, outboxId, error: message };
        }
    }
    onFailed(job, err) {
        this.logger.error(`Document email job ${job?.id ?? '?'} failed: ${err.message}`);
    }
};
exports.DocumentEmailProcessor = DocumentEmailProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], DocumentEmailProcessor.prototype, "onFailed", null);
exports.DocumentEmailProcessor = DocumentEmailProcessor = DocumentEmailProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(document_email_constants_1.DOCUMENT_EMAIL_QUEUE),
    __metadata("design:paramtypes", [document_email_service_1.DocumentEmailService])
], DocumentEmailProcessor);
//# sourceMappingURL=document-email.processor.js.map