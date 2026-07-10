import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
export declare class EmailTrackingController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    trackClick(logId: string, targetUrl: string | undefined, res: Response): Promise<void>;
}
