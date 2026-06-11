import { BadRequestException, Injectable } from '@nestjs/common';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext, BarcodeOperation } from '../barcode-validation-context.interface';
import { LifecycleStatus } from '@prisma/client';

/**
 * Simplified lifecycle validator.
 * Supports statuses: ACTIVE, INACTIVE, REPLACED.
 * Validates based on the operation being performed.
 */
@Injectable()
export class LifecycleValidator implements BarcodeValidator {
  async validate(context: BarcodeValidationContext): Promise<void> {
    const { operation, status } = context;

    // No status provided → nothing to validate.
    if (!status) return;

    // Only handle the three statuses we care about.
    if (status !== LifecycleStatus.ACTIVE &&
        status !== LifecycleStatus.INACTIVE &&
        status !== LifecycleStatus.REPLACED) {
      throw new BadRequestException(`Unsupported lifecycle status ${status}`);
    }

    // ---- Operation‑specific checks ----
    switch (operation) {
      case BarcodeOperation.CREATE:
        // Cannot create a barcode that is already REPLACED.
        if (status === LifecycleStatus.REPLACED) {
          throw new BadRequestException('Cannot create a barcode with REPLACED status');
        }
        break;

      case BarcodeOperation.DEACTIVATE:
        // Deactivate is only allowed when current status is ACTIVE.
        if (status !== LifecycleStatus.ACTIVE) {
          throw new BadRequestException('Can only deactivate an ACTIVE barcode');
        }
        break;

      case BarcodeOperation.REPLACE:
        // Replace operation expects current status to be ACTIVE.
        if (status !== LifecycleStatus.ACTIVE) {
          throw new BadRequestException('Can only replace an ACTIVE barcode');
        }
        break;

      // UPDATE, LOOKUP, etc. have no additional lifecycle constraints in this lean version.
      default:
        break;
    }
  }
}
