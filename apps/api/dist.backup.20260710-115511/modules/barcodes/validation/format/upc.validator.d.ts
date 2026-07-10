import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';
export declare class UPCValidator implements BarcodeValidator {
    validate(context: BarcodeValidationContext): Promise<void>;
    private isValidChecksum;
}
