import { BadRequestException, Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

/**
 * Simple QR code validator – ensures the value contains only allowed characters.
 * For demonstration we accept alphanumeric and common URL-safe symbols.
 */
@Injectable()
export class QRValidator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { barcodeValue } = context;
    // QR codes can contain a wide range of characters; here we enforce a basic pattern.
    const qrPattern = /^[A-Za-z0-9\-_.?=&]+$/;
    if (!qrPattern.test(barcodeValue)) {
      throw new BadRequestException('QR code contains invalid characters');
    }
  }
}
