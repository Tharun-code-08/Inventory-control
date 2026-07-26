import { CAPABILITIES_TEXT, IntentService } from './intent.service';

describe('IntentService', () => {
  const service = new IntentService();

  const ruleMatched: Array<[string]> = [
    ['hi'],
    ['Hii!'],
    ['hello'],
    ['Good Morning'],
    ['namaste'],
    ['help'],
    ['menu'],
    ['What can you do?'],
    ['thanks'],
    ['Thank you!'],
    ['ok'],
    ['low_stock'],
    ['revenue'],
  ];

  it.each(ruleMatched)('answers %p from the rule tier (no AI)', (text) => {
    expect(service.match(text)).not.toBeNull();
  });

  const fallThrough: string[] = [
    'stock of blue pens',
    'hi, how much stock of pens do we have?',
    'what is low on stock?',
    'sales this month',
    'top selling items',
    'what should I reorder?',
    'barcode 8901234567890',
    'hello everyone in the team meeting notes',
    'help me find the invoice for ACME',
    // snapshot/summary now falls through to AI for real data
    'summary',
    'snapshot',
    'overview',
  ];

  it.each(fallThrough)('passes %p through to the AI tier', (text) => {
    expect(service.match(text)).toBeNull();
  });

  it('answers empty/whitespace messages with the capabilities text', () => {
    const result = service.match('   ');
    expect(result?.body).toBe(CAPABILITIES_TEXT);
  });

  it('attaches quick-reply buttons to greeting reply', () => {
    const result = service.match('hi');
    expect(result?.buttons?.length).toBeGreaterThan(0);
  });

  it('returns no buttons for thanks reply', () => {
    const result = service.match('thanks');
    expect(result?.buttons).toBeUndefined();
  });

  describe('resolveButtonId', () => {
    it('translates known button IDs to natural-language queries', () => {
      expect(service.resolveButtonId('snapshot')).toContain('business snapshot');
      expect(service.resolveButtonId('low_stock')).toContain('minimum stock');
      expect(service.resolveButtonId('revenue')).toContain('revenue');
    });

    it('passes through unknown text unchanged', () => {
      expect(service.resolveButtonId('how much stock of pens?')).toBe('how much stock of pens?');
    });
  });
});
