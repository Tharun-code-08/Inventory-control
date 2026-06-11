import { Test, TestingModule } from '@nestjs/testing';
import { UPCValidator } from './upc.validator';
import { BarcodeValidationContext } from '../barcode-validation-context.interface';

describe('UPCValidator', () => {
  let validator: UPCValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UPCValidator],
    }).compile();
    validator = module.get<UPCValidator>(UPCValidator);
  });

  it('accepts a valid UPC-A barcode', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '036000291452', // valid UPC-A example
      companyId: 'c1',
      barcodeType: 'UPC',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('rejects barcodes with wrong length', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '12345678901', // 11 digits
      companyId: 'c1',
      barcodeType: 'UPC',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('UPC must be exactly 12 numeric digits');
  });

  it('rejects barcodes with invalid checksum', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: '036000291453', // invalid checksum
      companyId: 'c1',
      barcodeType: 'UPC',
      operation: 'CREATE',
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow('UPC checksum is invalid');
  });
});
