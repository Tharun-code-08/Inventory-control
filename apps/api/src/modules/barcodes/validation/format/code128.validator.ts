import { BadRequestException, Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * Validates Code128 barcodes.
 * For simplicity we only check that the value is non‑empty and within a typical length range (1‑30 characters).
 */
@Injectable()
export class Code128Validator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { barcodeValue } = context;
    if (!barcodeValue || barcodeValue.length === 0) {
      throw new BadRequestException('Code128 barcode cannot be empty');
    }
    if (barcodeValue.length > 30) {
      throw new BadRequestException('Code128 barcode exceeds maximum length of 30 characters');
    }
    // Additional character set validation could be added here if needed.
  }
}
