import type { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { DashboardService } from './dashboard.service';
import { DashboardEventDto } from './dto/dashboard-event.dto';
export declare class DashboardController {
    private readonly dashboard;
    private readonly audit;
    constructor(dashboard: DashboardService, audit: AuditService);
    summary(user: RequestUser, shopId?: string): Promise<import("./dashboard.service").DashboardSummaryPayload>;
    executive(user: RequestUser, shopId?: string): Promise<{
        financial: {
            revenueToday: number;
            revenueThisMonth: number;
            netProfitMonth: number;
            cashAvailable: number;
        };
        inventory: {
            inventoryValue: number;
            lowStockCount: number;
            deadStockValue: number;
            coverageDays: number;
        };
        attention: {
            id: string;
            severity: string;
            title: string;
            action: string;
        }[];
        recommendations: never[];
    }>;
    recordEvent(user: RequestUser, event: DashboardEventDto, ip: string, userAgent?: string): Promise<void>;
}
