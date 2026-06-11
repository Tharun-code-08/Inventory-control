import { BarcodeValidationContext } from '../barcode-validation-context.interface';

export interface BarcodeValidator {
  /**
   * Validate a barcode operation based on the provided context.
   * Should throw appropriate NestJS exceptions on failure.
   */
  validate(context: BarcodeValidationContext): Promise<void>;
}
