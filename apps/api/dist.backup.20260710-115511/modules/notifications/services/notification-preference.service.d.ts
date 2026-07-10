import { PrismaService } from "../../../prisma/prisma.service";
import { UpdateNotificationPreferenceDto } from '../dto';
import { NotificationPreference } from '@prisma/client';
export declare class NotificationPreferenceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getOrCreatePreferences(userId: string, companyId: string): Promise<NotificationPreference>;
    getPreferences(userId: string): Promise<NotificationPreference>;
    updatePreferences(userId: string, companyId: string, dto: UpdateNotificationPreferenceDto): Promise<NotificationPreference>;
    shouldReceiveNotification(userId: string, companyId: string, notificationType: string): Promise<boolean>;
    bulkToggle(userId: string, companyId: string, enable: boolean): Promise<NotificationPreference>;
    resetToDefaults(userId: string, companyId: string): Promise<NotificationPreference>;
}
