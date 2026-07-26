import { CAPABILITIES_TEXT, IntentService } from './intent.service';

describe('IntentService', () => {
  const service = new IntentService();

  const ruleMatched: Array<[string, string]> = [
    ['hi', 'greeting'],
    ['Hii!', 'greeting'],
    ['hello', 'greeting'],
    ['Good Morning', 'greeting'],
    ['namaste', 'greeting'],
    ['help', 'help'],
    ['menu', 'help'],
    ['What can you do?', 'help'],
    ['thanks', 'thanks'],
    ['Thank you!', 'thanks'],
    ['ok', 'thanks'],
    ['summary', 'snapshot'],
    ['snapshot', 'snapshot'],
    ['overview', 'snapshot'],
    ['get latest', 'snapshot'],
  ];

  it.each(ruleMatched)('answers %p from the rule tier (no AI)', (text) => {
    expect(service.match(text)).not.toBeNull();
  });

  const fallThrough: string[] = [
    'stock of blue pens',
    'hi, how much stock of pens do we have?', // greeting + question must NOT be swallowed
    'what is low on stock?',
    'sales this month',
    'top selling items',
    'what should I reorder?',
    'barcode 8901234567890',
    'hello everyone in the team meeting notes', // not a bare greeting
    'help me find the invoice for ACME',
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

  it('attaches quick-reply buttons to snapshot reply', () => {
    const result = service.match('summary');
    expect(result?.buttons?.length).toBeGreaterThan(0);
  });

  it('returns no buttons for thanks reply', () => {
    const result = service.match('thanks');
    expect(result?.buttons).toBeUndefined();
  });
});
