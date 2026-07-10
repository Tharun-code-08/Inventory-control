import { PdfClusterService } from './pdf-cluster.service';
export interface RenderContext {
    documentType: string;
    data: Record<string, any>;
    branding?: {
        logoUrl?: string;
        companyName?: string;
        colors?: Record<string, string>;
    };
}
export declare class PdfRendererService {
    private readonly pdfCluster;
    private readonly logger;
    private templates;
    private templatesDir;
    constructor(pdfCluster: PdfClusterService);
    private registerHandlebarsHelpers;
    renderPdf(context: RenderContext): Promise<Buffer>;
    private loadTemplate;
    preloadTemplates(documentTypes: string[]): Promise<void>;
}
