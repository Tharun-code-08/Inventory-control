import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext, BarcodeOperation } from '../barcode-validation-context.interface';

/**
 * Validates that a barcode is unique within the company.
 * Only runs on CREATE operations.
 */
@Injectable()
export class UniqueBarcodeValidator implements BarcodeValidator {
  constructor(private readonly prisma: PrismaService) {}

  async validate(context: BarcodeValidationContext): Promise<void> {
    if (context.operation !== BarcodeOperation.CREATE) return;

    const existing = await this.prisma.productBarcode.findUnique({
      where: {
        companyId_barcodeValue: {
          companyId: context.companyId,
          barcodeValue: context.barcodeValue,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Barcode already assigned to another product');
    }
  }
}
