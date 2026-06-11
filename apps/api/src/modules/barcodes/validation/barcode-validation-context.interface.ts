import { BarcodeType, LifecycleStatus } from '@prisma/client';

export enum BarcodeOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  REPLACE = 'REPLACE',
  DEACTIVATE = 'DEACTIVATE',
  LOOKUP = 'LOOKUP',
}

/**
 * Context passed to each validator. All fields are strongly typed – no `any`.
 */
export interface BarcodeValidationContext {
  /** Normalised barcode value */
  barcodeValue: string;
  /** Tenant / company identifier */
  companyId: string;
  /** Prisma enum for the barcode type */
  barcodeType: BarcodeType;
  /** Current lifecycle status (optional for CREATE) */
  status?: LifecycleStatus; // ACTIVE | INACTIVE | REPLACED
  /** Product the barcode belongs to (if applicable) */
  productId?: string;
  /** What operation is being performed */
  operation: BarcodeOperation;
}
