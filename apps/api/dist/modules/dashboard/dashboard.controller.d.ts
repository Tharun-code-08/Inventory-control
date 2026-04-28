import type { RequestUser } from '../../common/types/request-user';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboard;
    constructor(dashboard: DashboardService);
    summary(user: RequestUser, shopId?: string): Promise<import("./dashboard.service").DashboardSummaryPayload>;
}
