import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateNotificationPreferenceDto } from '../dto';
import { NotificationPreference } from '@prisma/client';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create notification preferences for a user
   */
  async getOrCreatePreferences(userId: string, companyId: string): Promise<NotificationPreference> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          companyId,
          grCreated: true,
          grApproved: true,
          grRejected: true,
          poApprovalRequired: true,
          poApproved: true,
          poRejected: true,
          lowStockAlert: true,
          transferCompleted: true,
          inventoryAdjustment: true,
          loginAlert: true,
          deviceAlert: true,
          pushEnabled: true,
          emailEnabled: false,
        },
      });
    }

    return preferences;
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      throw new NotFoundException('Notification preferences not found');
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, dto: UpdateNotificationPreferenceDto): Promise<NotificationPreference> {
    // Ensure preferences exist
    await this.getOrCreatePreferences(userId, '');

    const preferences = await this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        grCreated: dto.grCreated !== undefined ? dto.grCreated : undefined,
        grApproved: dto.grApproved !== undefined ? dto.grApproved : undefined,
        grRejected: dto.grRejected !== undefined ? dto.grRejected : undefined,
        poApprovalRequired: dto.poApprovalRequired !== undefined ? dto.poApprovalRequired : undefined,
        poApproved: dto.poApproved !== undefined ? dto.poApproved : undefined,
        poRejected: dto.poRejected !== undefined ? dto.poRejected : undefined,
        lowStockAlert: dto.lowStockAlert !== undefined ? dto.lowStockAlert : undefined,
        transferCompleted: dto.transferCompleted !== undefined ? dto.transferCompleted : undefined,
        inventoryAdjustment: dto.inventoryAdjustment !== undefined ? dto.inventoryAdjustment : undefined,
        loginAlert: dto.loginAlert !== undefined ? dto.loginAlert : undefined,
        deviceAlert: dto.deviceAlert !== undefined ? dto.deviceAlert : undefined,
        pushEnabled: dto.pushEnabled !== undefined ? dto.pushEnabled : undefined,
        emailEnabled: dto.emailEnabled !== undefined ? dto.emailEnabled : undefined,
      },
    });

    return preferences;
  }

  /**
   * Check if a user wants to receive a specific notification type
   */
  async shouldReceiveNotification(userId: string, notificationType: string): Promise<boolean> {
    const prefs = await this.getOrCreatePreferences(userId, '');

    const typeMap: Record<string, keyof NotificationPreference> = {
      GOODS_RECEIPT_CREATED: 'grCreated',
      GOODS_RECEIPT_APPROVED: 'grApproved',
      GOODS_RECEIPT_REJECTED: 'grRejected',
      PURCHASE_ORDER_APPROVED: 'poApprovalRequired',
      PURCHASE_ORDER_APPROVED_AP: 'poApproved',
      PURCHASE_ORDER_REJECTED: 'poRejected',
      LOW_STOCK: 'lowStockAlert',
      CRITICAL_STOCK: 'lowStockAlert',
      WAREHOUSE_TRANSFER_COMPLETED: 'transferCompleted',
      INVENTORY_ADJUSTMENT_COMPLETED: 'inventoryAdjustment',
      NEW_DEVICE_LOGIN: 'deviceAlert',
      LOGIN_ATTEMPT_LOCKOUT: 'loginAlert',
    };

    const prefKey = typeMap[notificationType];
    if (!prefKey) {
      return true; // Default to sending if type not in map
    }

    const pref = prefs[prefKey];
    return pref === true || pref === null; // Allow if not explicitly disabled
  }

  /**
   * Bulk enable/disable notifications
   */
  async bulkToggle(userId: string, enable: boolean): Promise<NotificationPreference> {
    return this.updatePreferences(userId, {
      grCreated: enable,
      grApproved: enable,
      grRejected: enable,
      poApprovalRequired: enable,
      poApproved: enable,
      poRejected: enable,
      lowStockAlert: enable,
      transferCompleted: enable,
      inventoryAdjustment: enable,
      loginAlert: enable,
      deviceAlert: enable,
      pushEnabled: enable,
    });
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<NotificationPreference> {
    return this.updatePreferences(userId, {
      grCreated: true,
      grApproved: true,
      grRejected: true,
      poApprovalRequired: true,
      poApproved: true,
      poRejected: true,
      lowStockAlert: true,
      transferCompleted: true,
      inventoryAdjustment: true,
      loginAlert: true,
      deviceAlert: true,
      pushEnabled: true,
      emailEnabled: false,
    });
  }
}
