import { parseDecision } from './approval';

describe('parseDecision', () => {
  const cases: Array<[string, ReturnType<typeof parseDecision>]> = [
    // approve verbs, with trailing punctuation / task references
    ['approve', 'approve'],
    ['Approve!', 'approve'],
    ['yes', 'approve'],
    ['YES.', 'approve'],
    ['ok', 'approve'],
    ['okay', 'approve'],
    ['confirm', 'approve'],
    ['go ahead', 'approve'],
    ['do it', 'approve'],
    ['approve task 421', 'approve'],
    ['approve #421', 'approve'],
    ['👍', 'approve'],
    // reject verbs
    ['no', 'reject'],
    ['cancel', 'reject'],
    ['Cancel it', 'reject'],
    ['reject', 'reject'],
    ['stop', 'reject'],
    ['discard', 'reject'],
    ['never mind', 'reject'],
    ['cancel task #421', 'reject'],
    // NOT decisions — must fall through to the AI (edit path)
    ['yes but change the qty to 25', null],
    ['ok, make it 30 units instead', null],
    ['change quantity to 25', null],
    ['no wait, use supplier Acme', null],
    ['approve the budget increase for marketing', null],
    ['what is in the draft?', null],
    ['', null],
    ['   ', null],
  ];

  it.each(cases)('parses %j → %s', (text, expected) => {
    expect(parseDecision(text)).toBe(expected);
  });
});
