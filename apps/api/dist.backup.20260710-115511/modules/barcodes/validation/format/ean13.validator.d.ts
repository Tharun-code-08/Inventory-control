import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';
export declare class EAN13Validator implements BarcodeValidator {
    validate(context: BarcodeValidationContext): Promise<void>;
    private isValidChecksum;
}
