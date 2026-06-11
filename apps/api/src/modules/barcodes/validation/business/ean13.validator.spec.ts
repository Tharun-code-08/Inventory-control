import { Test, TestingModule } from '@nestjs/testing';
import { EAN13Validator } from '../../format/ean13.validator';
import { BarcodeValidationContext } from '../../barcode-validation-context.interface';

describe('EAN13Validator', () => {
  let validator: EAN13Validator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EAN13Validator],
    }).compile();
    validator = module.get<EAN13Validator>(EAN13Validator);
  });

  it('should accept a valid EAN13 barcode', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '4006381333931', // known valid EAN13 (example)
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('should reject barcode with wrong length', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '123456789012', // 12 digits
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('EAN13 must be exactly 13 digits');
  });

  it('should reject barcode with invalid checksum', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '4006381333930', // same digits but wrong checksum
      companyId: 'c1',
      barcodeType: 'EAN13',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('EAN13 checksum is invalid');
  });
});
