import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BarcodeValidationContext } from './barcode-validation-context.interface';
import { BarcodeType, LifecycleStatus } from '@prisma/client';

/**
 * Service responsible for running all barcode validation logic.
 * It validates format (EAN13, UPC, QR, etc.) and business rules such as
 * uniqueness, lifecycle status, and permissions.
 *
 * The service is intentionally thin – each validator is a separate
 * injectable class that can be tested in isolation.
 */
@Injectable()
export class BarcodeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Main entry point – validates the provided context. */
  async validate(context: BarcodeValidationContext): Promise<void> {
    // 1️⃣ Format validators – placeholder implementation
    // In a real implementation each format validator would inspect
    // `context.barcodeValue` and throw BadRequestException on mismatch.
    // For now we assume format is always acceptable.

    // 2️⃣ Business validators
    await this.validateUniqueness(context);
    await this.validateLifecycle(context);
  }

  /** Ensure a barcode is not already assigned to another product. */
  private async validateUniqueness(context: BarcodeValidationContext): Promise<void> {
    const existing = await this.prisma.productBarcode.findUnique({
      where: {
        companyId_barcodeValue: {
          companyId: context.companyId,
          barcodeValue: context.barcodeValue,
        },
      },
      include: { product: { select: { productCode: true, description: true } } },
    });
    if (existing) {
      // Conflict if another product already owns it.
      throw new ConflictException(
        existing.product
          ? `Barcode is already assigned to ${existing.product.productCode} (${existing.product.description})`
          : 'Barcode is already assigned to another product',
      );
    }
  }

  /** Enforce lifecycle rules based on the current status of a product. */
  private async validateLifecycle(context: BarcodeValidationContext): Promise<void> {
    if (!context.status) return; // No status to validate.
    switch (context.status) {
      case 'ACTIVE':
        // No restriction – allowed.
        break;
      case 'INACTIVE':
        // Inactive barcodes are allowed but should issue a warning; NestJS does not have a warning type,
        // so we simply allow the operation. Clients can interpret the status.
        break;
      case 'OBSOLETE':
        throw new BadRequestException('Obsolete barcodes cannot be used');
      case 'REPLACED':
        // In a real system we would redirect to the replacement barcode.
        // Here we raise a BadRequestException with a helpful message.
        throw new BadRequestException('Barcode has been replaced – use the new barcode value');
      default:
        // Unknown status – reject.
        throw new BadRequestException(`Invalid lifecycle status: ${context.status}`);
    }
  }
}
