import { BadRequestException, ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BarcodeValidationContext, BarcodeOperation } from './barcode-validation-context.interface';
import { BarcodeValidator } from './interfaces/barcode-validator.interface';
import { BarcodeType } from '@prisma/client';

// format validators
import { EAN13Validator } from './format/ean13.validator';
import { UPCValidator } from './format/upc.validator';
import { QRValidator } from './format/qr.validator';
import { Code128Validator } from './format/code128.validator';

// business validators
import { UniqueBarcodeValidator } from './business/unique-barcode.validator';
import { LifecycleValidator } from './business/lifecycle.validator';

@Injectable()
export class BarcodeValidationService implements OnModuleInit {
  private formatMap: Map<BarcodeType, BarcodeValidator>;

  constructor(
    private readonly prisma: PrismaService,
    // format validators
    private readonly ean13: EAN13Validator,
    private readonly upc: UPCValidator,
    private readonly qr: QRValidator,
    private readonly code128: Code128Validator,
    // business validators
    private readonly unique: UniqueBarcodeValidator,
    private readonly lifecycle: LifecycleValidator,
  ) {}

  onModuleInit() {
    this.formatMap = new Map<BarcodeType, BarcodeValidator>([
      [BarcodeType.EAN13, this.ean13],
      [BarcodeType.UPC_A, this.upc],
      [BarcodeType.QR, this.qr],
      [BarcodeType.CODE128, this.code128],
    ]);
  }

  /** Main entry point – validates the provided context. */
  async validate(context: BarcodeValidationContext): Promise<void> {
    // ---- 1️⃣ Format validation (type‑based) ----
    const formatValidator = this.formatMap.get(context.barcodeType);
    if (!formatValidator) {
      throw new BadRequestException(`Unsupported barcode type ${context.barcodeType}`);
    }
    await formatValidator.validate(context);

    // ---- 2️⃣ Business validators ----
    await this.unique.validate(context);
    await this.lifecycle.validate(context);
  }
}
