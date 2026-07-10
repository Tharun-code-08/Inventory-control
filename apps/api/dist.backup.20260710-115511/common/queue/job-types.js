"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_CONFIG = exports.QueueName = exports.JobStatus = void 0;
exports.getQueueForDocumentType = getQueueForDocumentType;
var JobStatus;
(function (JobStatus) {
    JobStatus["QUEUED"] = "QUEUED";
    JobStatus["PROCESSING"] = "PROCESSING";
    JobStatus["UPLOADING"] = "UPLOADING";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["EXPIRED"] = "EXPIRED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var QueueName;
(function (QueueName) {
    QueueName["PDF_GENERATION"] = "pdf-generation";
    QueueName["REPORT_EXPORT"] = "report-export";
    QueueName["BARCODE_GENERATION"] = "barcode-generation";
})(QueueName || (exports.QueueName = QueueName = {}));
exports.QUEUE_CONFIG = {
    [QueueName.PDF_GENERATION]: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        timeout: 60000,
        removeOnComplete: {
            age: 3600,
        },
        removeOnFail: {
            age: 86400,
        },
    },
    [QueueName.REPORT_EXPORT]: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        timeout: 300000,
        removeOnComplete: {
            age: 7200,
        },
        removeOnFail: {
            age: 604800,
        },
    },
    [QueueName.BARCODE_GENERATION]: {
        attempts: 1,
        backoff: undefined,
        timeout: 30000,
        removeOnComplete: {
            age: 1800,
        },
        removeOnFail: {
            age: 86400,
        },
    },
};
function getQueueForDocumentType(documentType) {
    const entityPdfs = ['invoice', 'purchase-order', 'goods-receipt', 'goods-issue'];
    const reportPdfs = ['stock-report', 'inventory-valuation', 'product-catalog', 'supplier-report'];
    const barcodePdfs = ['barcode-label', 'barcode-batch', 'barcode-a4-sheet', 'barcode-thermal'];
    if (entityPdfs.includes(documentType))
        return QueueName.PDF_GENERATION;
    if (reportPdfs.includes(documentType))
        return QueueName.REPORT_EXPORT;
    if (barcodePdfs.includes(documentType))
        return QueueName.BARCODE_GENERATION;
    throw new Error(`Unknown document type: ${documentType}`);
}
//# sourceMappingURL=job-types.js.map