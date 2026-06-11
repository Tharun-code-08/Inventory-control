import { BadRequestException, Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * Validates UPC‑A barcodes.
 * - Must be exactly 12 digits.
 * - Must pass the UPC checksum algorithm.
 */
@Injectable()
export class UPCValidator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { barcodeValue } = context;
    if (!/^[0-9]{12}$/.test(barcodeValue)) {
      throw new BadRequestException('UPC must be exactly 12 numeric digits');
    }
    if (!this.isValidChecksum(barcodeValue)) {
      throw new BadRequestException('UPC checksum is invalid');
    }
  }

  private isValidChecksum(value: string): boolean {
    const digits = value.split('').map(d => Number(d));
    // UPC checksum: (3 * sum of odd positions + sum of even positions) % 10 === 0
    const oddSum = digits
      .filter((_, i) => i % 2 === 0) // positions 1,3,5,... (0‑based even)
      .reduce((a, b) => a + b, 0);
    const evenSum = digits
      .filter((_, i) => i % 2 === 1) // positions 2,4,6,...
      .reduce((a, b) => a + b, 0);
    const checksum = (oddSum * 3 + evenSum) % 10;
    return checksum === 0;
  }
}
