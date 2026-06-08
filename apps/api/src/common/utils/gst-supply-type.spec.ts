import { GstSupplyType } from '@prisma/client';
import { gstStateCodeFromTaxId, resolveGstSupplyType } from './gst-supply-type';

describe('gst-supply-type', () => {
  it('extracts state code from GSTIN', () => {
    expect(gstStateCodeFromTaxId('27AABCU9603R1ZM')).toBe('27');
    expect(gstStateCodeFromTaxId('')).toBeNull();
  });

  it('detects inter-state when GSTIN prefixes differ', () => {
    expect(
      resolveGstSupplyType({
        shopTaxId: '27AABCU9603R1ZM',
        customerTaxId: '29AABCU9603R1ZM',
      }),
    ).toBe(GstSupplyType.INTER_STATE);
  });

  it('defaults to intra-state when codes match or missing', () => {
    expect(
      resolveGstSupplyType({
        shopTaxId: '27AABCU9603R1ZM',
        customerTaxId: '27XYZCU9603R1ZM',
      }),
    ).toBe(GstSupplyType.INTRA_STATE);
    expect(resolveGstSupplyType({ shopTaxId: null, customerTaxId: '27AABCU9603R1ZM' })).toBe(
      GstSupplyType.INTRA_STATE,
    );
  });
});
