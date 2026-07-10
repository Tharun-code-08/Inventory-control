import type { AuditLogParams } from '../../modules/audit/audit.service';
export type ProductChangedFields = {
    productCode?: {
        old: string;
        new: string;
    };
    description?: {
        old: string;
        new: string;
    };
    uom?: {
        old: string;
        new: string;
    };
    category?: {
        old: string | null;
        new: string | null;
    };
    hsnCode?: {
        old: string | null;
        new: string | null;
    };
    materialGroup?: {
        old: string | null;
        new: string | null;
    };
    drawingReference?: {
        old: string | null;
        new: string | null;
    };
    brand?: {
        old: string | null;
        new: string | null;
    };
    taxPreference?: {
        old: string;
        new: string;
    };
    gstRate?: {
        old: number;
        new: number;
    };
    purchasePrice?: {
        old: number;
        new: number;
    };
    sellingPrice?: {
        old: number;
        new: number;
    };
    isActive?: {
        old: boolean;
        new: boolean;
    };
};
export declare function buildCreateProductAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    productCode: string;
    description: string;
}): AuditLogParams;
export declare function buildUpdateProductAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    productCode: string;
    changedFields: ProductChangedFields;
}): AuditLogParams;
export declare function buildDeleteProductAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    productCode: string;
    description: string;
}): AuditLogParams;
