import { DocumentSeriesRestart } from '@prisma/client';
export type DocumentSeriesModuleDef = {
    docType: string;
    moduleLabel: string;
    defaultPrefix: string;
    defaultStartingNumber: number;
    defaultPadWidth: number;
    defaultRestartPeriod: DocumentSeriesRestart;
    shopScoped: boolean;
    defaultUseCategoryPrefix?: boolean;
};
export declare const DOCUMENT_SERIES_MODULES: DocumentSeriesModuleDef[];
export declare const DOCUMENT_SERIES_MODULE_BY_TYPE: Map<string, DocumentSeriesModuleDef>;
export declare function getBuiltInSeriesDefault(docType: string): DocumentSeriesModuleDef | undefined;
