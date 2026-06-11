import { Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * QR validator – currently allows any string value without restriction.
 * Validation logic can be extended in the future as needed.
 */
@Injectable()
export class QRValidator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    // No validation applied for QR codes in this iteration.
    return;
  }
}
