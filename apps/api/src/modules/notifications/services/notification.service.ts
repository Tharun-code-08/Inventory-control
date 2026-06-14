import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateNotificationDto, NotificationFilterDto } from '../dto';
import { Notification, NotificationStatus } from '@prisma/client';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create and send a notification to a user
   */
  async create(dto: CreateNotificationDto, userId: string, companyId: string): Promise<Notification> {
    // Validate user exists and belongs to company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create notification with 30-day expiry if not specified
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + THIRTY_DAYS_MS);

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        companyId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        priority: dto.priority,
        module: dto.module,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        deepLink: dto.deepLink,
        actionUrl: dto.actionUrl,
        expiresAt,
        createdById: userId,
      },
    });

    // Log audit
    await this.auditLog('NOTIFICATION_SENT', userId, companyId, notification.id, {
      type: dto.type,
      priority: dto.priority,
      recipientId: dto.userId,
    });

    return notification;
  }

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getNotifications(
    userId: string,
    companyId: string,
    filter: NotificationFilterDto,
  ): Promise<{ data: Notification[]; total: number; unreadCount: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      companyId,
    };

    if (filter.isRead !== undefined) {
      where.isRead = filter.isRead;
    }

    if (filter.module) {
      where.module = filter.module;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    // Only include non-expired notifications
    where.OR = [{ expiresAt: { gt: new Date() } }, { expiresAt: null }];

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filter.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return { data: notifications, total, unreadCount };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    // Log audit
    await this.auditLog('NOTIFICATION_READ', userId, notification.companyId, notificationId, {});

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, companyId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        companyId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    // Log audit
    await this.auditLog('NOTIFICATIONS_READ_ALL', userId, companyId, null, {
      count: result.count,
    });

    return { updated: result.count };
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string, companyId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const deleted = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELETED,
      },
    });

    // Log audit
    await this.auditLog('NOTIFICATION_DELETED', userId, companyId, notificationId, {});

    return deleted;
  }

  /**
   * Get a single notification
   */
  async getNotification(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string, companyId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        companyId,
        isRead: false,
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
      },
    });
  }

  /**
   * Get notifications by reference (e.g., all notifications for a specific GR)
   */
  async getNotificationsByReference(
    referenceType: string,
    referenceId: string,
    companyId: string,
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        companyId,
        referenceType,
        referenceId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Clean up expired notifications (scheduled job)
   */
  async deleteExpiredNotifications(): Promise<{ deleted: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Deleted ${result.count} expired notifications`);
    return { deleted: result.count };
  }

  /**
   * Record audit log for notification actions
   */
  private async auditLog(
    action: string,
    userId: string,
    companyId: string,
    notificationId: string | null,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.notificationAuditLog.create({
        data: {
          action,
          userId,
          companyId,
          notificationId,
          details: details || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log for ${action}`, error);
    }
  }

  /**
   * Send notifications to a role (role-based notifications)
   */
  async sendToRole(
    dto: CreateNotificationDto,
    roleName: string,
    companyId: string,
    currentUserId: string,
  ): Promise<{ sent: number; failed: number }> {
    // Get all users with the specified role in the company
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: roleName as any },
        shop: { companyId },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.create({ ...dto, userId: user.id }, currentUserId, companyId);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${user.id}`, error);
        failed++;
      }
    }

    return { sent, failed };
  }
}
