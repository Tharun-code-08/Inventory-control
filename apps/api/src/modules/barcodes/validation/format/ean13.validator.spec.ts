import { Test, TestingModule } from '@nestjs/testing';
import { EAN13Validator } from './ean13.validator';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

describe('EAN13Validator', () => {
  let validator: EAN13Validator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EAN13Validator],
    }).compile();
    validator = module.get<EAN13Validator>(EAN13Validator);
  });

  it('accepts a valid EAN13 barcode', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '4006381333931', // valid example
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('rejects barcodes with wrong length', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '123456789012', // 12 digits
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('EAN13 must be exactly 13 numeric digits');
  });

  it('rejects barcodes with invalid checksum', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '4006381333930', // invalid checksum
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('EAN13 checksum is invalid');
  });
});
