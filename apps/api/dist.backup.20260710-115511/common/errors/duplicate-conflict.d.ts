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
export declare function throwDuplicateRecordConflict(message: string, details: DuplicateRecordDetails, telemetry?: DuplicateRecordTelemetryContext): never;
