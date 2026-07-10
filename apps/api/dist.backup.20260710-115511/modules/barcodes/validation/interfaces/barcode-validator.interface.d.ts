import { BarcodeValidationContext } from '../barcode-validation-context.interface';
export interface BarcodeValidator {
    validate(context: BarcodeValidationContext): Promise<void>;
}
