"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwDuplicateRecordConflict = throwDuplicateRecordConflict;
const common_1 = require("@nestjs/common");
const duplicateLogger = new common_1.Logger('DuplicateRecordTelemetry');
function throwDuplicateRecordConflict(message, details, telemetry) {
    duplicateLogger.warn(JSON.stringify({
        event: 'duplicate_record_detected',
        entity: details.entity,
        recordId: details.recordId,
        recordCode: details.recordCode ?? null,
        recordName: details.recordName ?? null,
        isArchived: details.isArchived ?? false,
        userId: telemetry?.userId ?? null,
        userEmail: telemetry?.userEmail ?? null,
        shopId: telemetry?.shopId ?? null,
        companyId: telemetry?.companyId ?? null,
        timestamp: new Date().toISOString(),
    }));
    throw new common_1.ConflictException({
        message,
        code: 'DUPLICATE_RECORD',
        details,
    });
}
//# sourceMappingURL=duplicate-conflict.js.map