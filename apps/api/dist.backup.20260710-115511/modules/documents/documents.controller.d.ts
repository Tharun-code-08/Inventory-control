import type { Response } from 'express';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { DocumentEmailService } from '../document-email/document-email.service';
export declare class DocumentsController {
    private readonly documentPdf;
    private readonly documentEmail;
    private readonly logger;
    constructor(documentPdf: DocumentPdfService, documentEmail: DocumentEmailService);
    downloadPdf(user: RequestUser, kind: string, id: string, res: Response): Promise<void>;
    emailHistory(user: RequestUser, kind: string, id: string): Promise<{
        data: {
            history: import("../document-email/document-email.types").DocumentEmailHistoryRow[];
            summary: import("../document-email/document-email.types").DocumentEmailSummary | null;
        };
    }>;
}
