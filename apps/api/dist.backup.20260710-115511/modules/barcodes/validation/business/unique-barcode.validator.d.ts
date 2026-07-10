import { PrismaService } from '../../../../prisma/prisma.service';
import { BarcodeValidator } from '../interfaces/barcode-validator.interface';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';
export declare class UniqueBarcodeValidator implements BarcodeValidator {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validate(context: BarcodeValidationContext): Promise<void>;
}
