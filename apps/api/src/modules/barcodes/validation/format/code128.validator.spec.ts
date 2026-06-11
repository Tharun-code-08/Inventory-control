import { Test, TestingModule } from '@nestjs/testing';
import { Code128Validator } from './code128.validator';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

describe('Code128Validator', () => {
  let validator: Code128Validator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Code128Validator],
    }).compile();
    validator = module.get<Code128Validator>(Code128Validator);
  });

  it('accepts a non‑empty barcode within length limit', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'ABC123',
      companyId: 'c1',
      barcodeType: 'CODE128',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('rejects empty barcode', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '',
      companyId: 'c1',
      barcodeType: 'CODE128',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow();
  });

  it('rejects barcode exceeding max length', async () => {
    const longValue = 'A'.repeat(31);
    const ctx: BarcodeValidationContext = {
      barcodeValue: longValue,
      companyId: 'c1',
      barcodeType: 'CODE128',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow();
  });
});
