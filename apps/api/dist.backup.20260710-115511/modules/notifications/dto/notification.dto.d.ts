import { AlertType, NotificationPriority, NotificationModule, NotificationStatus } from '@prisma/client';
export declare class CreateNotificationDto {
    title: string;
    message: string;
    type: AlertType;
    priority?: NotificationPriority;
    module: NotificationModule;
    referenceType?: string;
    referenceId?: string;
    deepLink?: string;
    actionUrl?: string;
    userId: string;
    expiresAt?: string;
}
export declare class NotificationResponseDto {
    id: string;
    userId: string;
    companyId: string;
    title: string;
    message: string;
    type: AlertType;
    priority: NotificationPriority;
    module: NotificationModule;
    status: NotificationStatus;
    referenceType?: string | null;
    referenceId?: string | null;
    deepLink?: string | null;
    actionUrl?: string | null;
    isRead: boolean;
    readAt?: Date | null;
    createdAt: Date;
    expiresAt?: Date | null;
}
export declare class MarkAsReadDto {
    notificationId: string;
}
export declare class UpdateNotificationStatusDto {
    status: NotificationStatus;
}
export declare class NotificationFilterDto {
    isRead?: boolean;
    module?: NotificationModule;
    priority?: NotificationPriority;
    type?: AlertType;
    page?: number;
    limit?: number;
}
export declare class NotificationListResponseDto {
    data: NotificationResponseDto[];
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
    hasMore: boolean;
}
