export declare class NotificationPreferenceDto {
    grCreated?: boolean;
    grApproved?: boolean;
    grRejected?: boolean;
    poApprovalRequired?: boolean;
    poApproved?: boolean;
    poRejected?: boolean;
    lowStockAlert?: boolean;
    transferCompleted?: boolean;
    inventoryAdjustment?: boolean;
    loginAlert?: boolean;
    deviceAlert?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
}
export declare class NotificationPreferenceResponseDto extends NotificationPreferenceDto {
    id: string;
    userId: string;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class UpdateNotificationPreferenceDto {
    grCreated?: boolean;
    grApproved?: boolean;
    grRejected?: boolean;
    poApprovalRequired?: boolean;
    poApproved?: boolean;
    poRejected?: boolean;
    lowStockAlert?: boolean;
    transferCompleted?: boolean;
    inventoryAdjustment?: boolean;
    loginAlert?: boolean;
    deviceAlert?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
}
