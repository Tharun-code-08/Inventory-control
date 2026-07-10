import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
export declare class InvoicePdfService {
    private readonly prisma;
    private readonly brandingService;
    private readonly logger;
    constructor(prisma: PrismaService, brandingService: BrandingService);
    generatePdf(invoiceId: string): Promise<Buffer>;
    regeneratePdf(invoiceId: string): Promise<Buffer>;
}
