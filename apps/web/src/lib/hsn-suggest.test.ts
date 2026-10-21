import { describe, expect, it } from 'vitest';
import { suggestHsnFromDescription } from './hsn-suggest';

describe('suggestHsnFromDescription', () => {
  it('does not match keywords inside other words', () => {
    const open = suggestHsnFromDescription('Open shelf price tag');
    const pen = suggestHsnFromDescription('Ball pen');
    expect(pen).not.toBeNull();
    expect(open?.code).not.toBe(pen?.code);
  });

  it('still matches plural forms', () => {
    expect(suggestHsnFromDescription('Blue pens')?.code).toBe(suggestHsnFromDescription('Blue pen')?.code);
  });
});
