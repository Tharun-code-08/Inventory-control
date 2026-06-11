import { BadRequestException, Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * Validates EAN‑13 barcodes.
 * - Must be exactly 13 digits.
 * - Must pass the standard checksum algorithm.
 */
@Injectable()
export class EAN13Validator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { barcodeValue } = context;
    if (!/^[0-9]{13}$/.test(barcodeValue)) {
      throw new BadRequestException('EAN13 must be exactly 13 numeric digits');
    }
    if (!this.isValidChecksum(barcodeValue)) {
      throw new BadRequestException('EAN13 checksum is invalid');
    }
  }

  private isValidChecksum(value: string): boolean {
    const digits = value.split('').map(d => Number(d));
    const sum = digits
      .slice(0, 12)
      .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === digits[12];
  }
}
