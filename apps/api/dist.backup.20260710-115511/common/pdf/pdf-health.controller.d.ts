import { PdfClusterService } from './pdf-cluster.service';
export declare class PdfHealthController {
    private readonly pdfCluster;
    private readonly logger;
    constructor(pdfCluster: PdfClusterService);
    getPdfHealth(): Promise<{
        success: boolean;
        data: {
            status: string;
            cluster: {
                activeBrowsers: number;
                activePages: number;
                queuedTasks: number;
                successfulRenders: number;
                failedRenders: number;
                avgRenderTimeMs: number;
                memoryMB: number;
                browserRestarts: number;
            };
            timestamp: Date;
        };
    }>;
}
