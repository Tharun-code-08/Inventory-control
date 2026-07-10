type BackupEmailParams = {
    companyCode: string | null;
    fileName: string;
    approxSizeKb: number;
};
export declare function backupDeliverySubject(params: BackupEmailParams): string;
export declare function backupDeliveryText(params: BackupEmailParams): string;
export declare function backupDeliveryHtml(params: BackupEmailParams): string;
export {};
