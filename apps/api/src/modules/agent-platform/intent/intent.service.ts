import { Injectable } from '@nestjs/common';

export const CAPABILITIES_REPLY = [
  'Here is what you can ask me:',
  '',
  '*📊 Reports & Stock*',
  '- "How much stock of X?"',
  '- "What is low on stock?"',
  '- "Top selling items this month"',
  '- "Sales overview"',
  '- "What should I reorder?"',
  '',
  '*📝 Create (I will draft — you approve)*',
  '- "Create PO for 10 units of X from Supplier Y"',
  '- "Create sales order for customer Z"',
  '- "Create goods receipt for PO-00001"',
  '- "Create invoice for SO-00001"',
  '- "Transfer 5 units of X from Shop A to Shop B"',
  '',
  'Just ask in plain language!',
].join('\n');

const GREETING_REPLY = [
  '👋 Hello! I\'m your SoftDigit ERP assistant.',
  '',
  'I can answer questions about your inventory and *draft ERP transactions* for you to approve.',
  '',
  CAPABILITIES_REPLY,
].join('\n');

type IntentRule = {
  name: string;
  pattern: RegExp;
  reply: string;
};

/**
 * Rule tier of the intent engine: deterministic answers that need no AI call
 * (and therefore cost nothing). Anything unmatched falls through to the AI
 * orchestrator. Extend by adding rows — keep patterns anchored/tight so real
 * questions ("hi, how much stock of pens?") are NOT swallowed by a rule.
 */
const RULES: IntentRule[] = [
  {
    name: 'greeting',
    pattern: /^(hi+|hey+|hello+|namaste|hola|good\s+(morning|afternoon|evening))[\s!.,:;)]*$/i,
    reply: GREETING_REPLY,
  },
  {
    name: 'help',
    pattern: /^(help|menu|options?|commands?|what can you do\??|capabilities)[\s!.?]*$/i,
    reply: CAPABILITIES_REPLY,
  },
  {
    name: 'thanks',
    pattern: /^(thanks?|thank you|thx|ty|ok(ay)?|great|nice|cool|👍|🙏)[\s!.]*$/i,
    reply: 'Anytime! 👍',
  },
];

@Injectable()
export class IntentService {
  /** Returns a canned reply for trivial messages, or null to engage the AI. */
  match(text: string): string | null {
    const normalized = text.trim();
    if (!normalized) return CAPABILITIES_REPLY;
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) return rule.reply;
    }
    return null;
  }
}
