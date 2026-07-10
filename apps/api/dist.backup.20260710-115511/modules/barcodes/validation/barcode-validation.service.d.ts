import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BarcodeValidationContext } from './barcode-validation-context.interface';
import { EAN13Validator } from './format/ean13.validator';
import { UPCValidator } from './format/upc.validator';
import { QRValidator } from './format/qr.validator';
import { Code128Validator } from './format/code128.validator';
import { UniqueBarcodeValidator } from './business/unique-barcode.validator';
import { LifecycleValidator } from './business/lifecycle.validator';
export declare class BarcodeValidationService implements OnModuleInit {
    private readonly prisma;
    private readonly ean13;
    private readonly upc;
    private readonly qr;
    private readonly code128;
    private readonly unique;
    private readonly lifecycle;
    private formatMap;
    constructor(prisma: PrismaService, ean13: EAN13Validator, upc: UPCValidator, qr: QRValidator, code128: Code128Validator, unique: UniqueBarcodeValidator, lifecycle: LifecycleValidator);
    onModuleInit(): void;
    validate(context: BarcodeValidationContext): Promise<void>;
}
