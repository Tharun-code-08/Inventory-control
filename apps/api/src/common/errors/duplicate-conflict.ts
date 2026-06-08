import { ConflictException, Logger } from '@nestjs/common';

const duplicateLogger = new Logger('DuplicateRecordTelemetry');

export type DuplicateRecordDetails = {
  recordId: string;
  recordCode?: string;
  recordName?: string;
  entity: string;
  listPath?: string;
  isArchived?: boolean;
};

export type DuplicateRecordTelemetryContext = {
  userId?: string;
  userEmail?: string;
  shopId?: string | null;
  companyId?: string | null;
};

export function throwDuplicateRecordConflict(
  message: string,
  details: DuplicateRecordDetails,
  telemetry?: DuplicateRecordTelemetryContext,
): never {
  duplicateLogger.warn(
    JSON.stringify({
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
    }),
  );

  throw new ConflictException({
    message,
    code: 'DUPLICATE_RECORD',
    details,
  });
}
