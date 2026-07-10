declare const severityValues: readonly ["URGENT", "WARNING", "ACTION", "INFO"];
declare const channelValues: readonly ["Email", "SMS", "In-app", "WhatsApp"];
export declare class NotificationRuleDto {
    id: string;
    title: string;
    notifyTo: string;
    severity: (typeof severityValues)[number];
    channels: Array<(typeof channelValues)[number]>;
}
export declare class NotificationGroupDto {
    id: string;
    title: string;
    moduleTags: string[];
    rules: NotificationRuleDto[];
}
export declare class UpdateNotificationConfigDto {
    groups: NotificationGroupDto[];
    version?: string;
}
export {};
