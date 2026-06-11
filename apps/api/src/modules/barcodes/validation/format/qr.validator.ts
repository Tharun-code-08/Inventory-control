import { Injectable, BadRequestException } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * QR validator – currently allows any string value without restriction.
 * Validation logic can be extended in the future as needed.
 */
@Injectable()
export class QRValidator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { barcodeValue } = context;
    if (!/^[A-Za-z0-9\-._?&]+$/.test(barcodeValue)) {
      throw new BadRequestException('QR code contains invalid characters');
    }
    // No further validation needed for QR in this iteration.
  }
}
