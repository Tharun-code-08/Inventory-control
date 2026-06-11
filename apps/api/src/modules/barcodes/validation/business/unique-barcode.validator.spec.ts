import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UniqueBarcodeValidator } from './unique-barcode.validator';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BarcodeValidationContext, BarcodeOperation } from '../barcode-validation-context.interface';

describe('UniqueBarcodeValidator', () => {
  let validator: UniqueBarcodeValidator;

  const mockPrisma = {
    productBarcode: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UniqueBarcodeValidator, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    // Reset mock calls before each test
    mockPrisma.productBarcode.findUnique.mockReset();
    // Retrieve the validator instance from the testing module
    validator = module.get<UniqueBarcodeValidator>(UniqueBarcodeValidator);
  });

  it('passes when no existing barcode on CREATE', async () => {
    mockPrisma.productBarcode.findUnique.mockResolvedValue(null);
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'ABC123',
      companyId: 'c1',
      barcodeType: 'QR',
      operation: BarcodeOperation.CREATE,
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
  });

  it('throws ConflictException when barcode already exists on CREATE', async () => {
    mockPrisma.productBarcode.findUnique.mockResolvedValue({ id: 1 });
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'ABC123',
      companyId: 'c1',
      barcodeType: 'QR',
      operation: BarcodeOperation.CREATE,
    } as any;
    await expect(validator.validate(ctx)).rejects.toThrow(ConflictException);
  });

  it('does nothing on non-CREATE operations', async () => {
    const ctx: BarcodeValidationContext = {
      barcodeValue: 'ABC123',
      companyId: 'c1',
      barcodeType: 'QR',
      operation: BarcodeOperation.UPDATE,
    } as any;
    await expect(validator.validate(ctx)).resolves.not.toThrow();
    expect(mockPrisma.productBarcode.findUnique).not.toHaveBeenCalled();
  });
});
