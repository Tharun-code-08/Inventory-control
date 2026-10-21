import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  const cols = [{ header: 'Value', value: (r: { v: string | number }) => r.v }];

  it('neutralises cells a spreadsheet would run as formulas', () => {
    const csv = toCsv([{ v: '=HYPERLINK("http://x")' }, { v: '+1+1' }, { v: '@SUM(A1)' }, { v: '-cmd' }], cols);
    expect(csv.split('\r\n').slice(1)).toEqual(['"\'=HYPERLINK(""http://x"")"', "'+1+1", "'@SUM(A1)", "'-cmd"]);
  });

  it('leaves numbers and negative amounts alone', () => {
    const csv = toCsv([{ v: -5 }, { v: '-12.50' }, { v: 'Acme' }], cols);
    expect(csv.split('\r\n').slice(1)).toEqual(['-5', '-12.50', 'Acme']);
  });
});
