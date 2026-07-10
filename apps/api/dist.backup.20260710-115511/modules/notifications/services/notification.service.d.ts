import { PrismaService } from "../../../prisma/prisma.service";
import { CreateNotificationDto, NotificationFilterDto } from '../dto';
import { Notification } from '@prisma/client';
export declare class NotificationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(dto: CreateNotificationDto, actorId: string | null | undefined, companyId: string): Promise<Notification>;
    getNotifications(userId: string, companyId: string, filter: NotificationFilterDto): Promise<{
        data: Notification[];
        total: number;
        unreadCount: number;
    }>;
    markAsRead(notificationId: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string, companyId: string): Promise<{
        updated: number;
    }>;
    delete(notificationId: string, userId: string, companyId: string): Promise<Notification>;
    getNotification(notificationId: string, userId: string): Promise<Notification>;
    getUnreadCount(userId: string, companyId: string): Promise<number>;
    getNotificationsByReference(referenceType: string, referenceId: string, companyId: string): Promise<Notification[]>;
    deleteExpiredNotifications(): Promise<{
        deleted: number;
    }>;
    private auditLog;
    notifyRoles(roles: string[], payload: Omit<CreateNotificationDto, 'userId'>, companyId: string, actorId?: string | null): Promise<{
        sent: number;
        failed: number;
    }>;
    sendToRole(dto: CreateNotificationDto, roleName: string, companyId: string, currentUserId?: string | null): Promise<{
        sent: number;
        failed: number;
    }>;
}
