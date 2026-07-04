import { Injectable } from '@nestjs/common';

export const CAPABILITIES_REPLY = [
  'Here is what you can ask me:',
  '- 📦 Stock: "stock of blue pens"',
  '- 🔍 Products: "find products in Stationery"',
  '- 🏷️ Barcode: "barcode 8901234567890"',
  '- ⚠️ Low stock: "what is low on stock?"',
  '- 📈 Sales: "sales this month"',
  '- 🔝 Top sellers: "top selling items this month"',
  '- 🛒 Reorder: "what should I reorder?"',
  'Just ask in plain language.',
].join('\n');

const GREETING_REPLY = `👋 Hello! I'm your inventory assistant.\n\n${CAPABILITIES_REPLY}`;

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
