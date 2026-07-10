import { NotificationService, NotificationPreferenceService } from './services';
import { CreateNotificationDto, NotificationResponseDto, NotificationListResponseDto, NotificationFilterDto, UpdateNotificationPreferenceDto, NotificationPreferenceResponseDto } from './dto';
export declare class NotificationController {
    private readonly notificationService;
    private readonly preferenceService;
    private readonly logger;
    constructor(notificationService: NotificationService, preferenceService: NotificationPreferenceService);
    createNotification(dto: CreateNotificationDto, user: any): Promise<NotificationResponseDto>;
    getNotifications(filter: NotificationFilterDto, user: any): Promise<NotificationListResponseDto>;
    getUnreadCount(user: any): Promise<{
        count: number;
    }>;
    getNotification(notificationId: string, user: any): Promise<NotificationResponseDto>;
    markAsRead(notificationId: string, user: any): Promise<NotificationResponseDto>;
    markAllAsRead(user: any): Promise<{
        updated: number;
    }>;
    deleteNotification(notificationId: string, user: any): Promise<NotificationResponseDto>;
    getNotificationsByReference(referenceType: string, referenceId: string, user: any): Promise<NotificationResponseDto[]>;
    getMyPreferences(user: any): Promise<NotificationPreferenceResponseDto>;
    getUserPreferences(userId: string): Promise<NotificationPreferenceResponseDto>;
    updateMyPreferences(dto: UpdateNotificationPreferenceDto, user: any): Promise<NotificationPreferenceResponseDto>;
    updateUserPreferences(userId: string, dto: UpdateNotificationPreferenceDto, user: any): Promise<NotificationPreferenceResponseDto>;
    resetPreferences(userId: string, user: any): Promise<NotificationPreferenceResponseDto>;
    toggleAllPreferences(userId: string, body: {
        enable: boolean;
    }, user: any): Promise<NotificationPreferenceResponseDto>;
}
