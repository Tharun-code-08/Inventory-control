import type { Response } from 'express';
import { MetricsService } from './metrics.service';
export declare class MetricsController {
    private readonly metrics;
    constructor(metrics: MetricsService);
    scrape(res: Response): Promise<void>;
}
