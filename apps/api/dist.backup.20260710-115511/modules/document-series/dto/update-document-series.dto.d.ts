import { DocumentSeriesRestart } from '@prisma/client';
export declare class DocumentSeriesRowDto {
    docType: string;
    prefix?: string;
    startingNumber?: number;
    padWidth?: number;
    restartPeriod?: DocumentSeriesRestart;
    shopScoped?: boolean;
    enabled?: boolean;
    useCategoryPrefix?: boolean;
}
export declare class UpdateDocumentSeriesDto {
    rows: DocumentSeriesRowDto[];
}
