import { Test, TestingModule } from '@nestjs/testing';
import { QRValidator } from './qr.validator';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

describe('QRValidator', () => {
  let validator: QRValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QRValidator],
    }).compile();
    validator = module.get<QRValidator>(QRValidator);
  });

  it('accepts valid alphanumeric QR code', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'ABCD1234-._?&',
      companyId: 'c1',
      barcodeType: 'QR',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('rejects QR code with invalid characters', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'invalid%code',
      companyId: 'c1',
      barcodeType: 'QR',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow();
  });
});
