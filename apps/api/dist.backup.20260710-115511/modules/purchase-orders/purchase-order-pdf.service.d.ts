import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
export declare class PurchaseOrderPdfService {
    private readonly prisma;
    private readonly brandingService;
    private readonly logger;
    constructor(prisma: PrismaService, brandingService: BrandingService);
    generatePdf(poId: string): Promise<Buffer>;
    regeneratePdf(poId: string): Promise<Buffer>;
}
