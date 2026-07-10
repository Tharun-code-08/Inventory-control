import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
export declare class JobFailureService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    record(job: Job, error: Error): Promise<void>;
    private toJsonSafe;
}
