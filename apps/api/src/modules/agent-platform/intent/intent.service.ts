import { Injectable } from '@nestjs/common';
import type { OutboundReply, QuickReply } from '../channels/channel-adapter.interface';

export const CAPABILITIES_TEXT = [
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

/** @deprecated Use CAPABILITIES_TEXT — exported for backward compat */
export const CAPABILITIES_REPLY = CAPABILITIES_TEXT;

const GREETING_TEXT = [
  "👋 Hello! I'm your SoftDigit ERP assistant.",
  '',
  'I can answer questions about your inventory and *draft ERP transactions* for you to approve.',
  '',
  CAPABILITIES_TEXT,
].join('\n');

const MAIN_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'snapshot', title: '📊 Snapshot' },
  { id: 'low_stock', title: '📦 Low stock' },
  { id: 'help', title: '❓ What can I do?' },
];

const SNAPSHOT_BUTTONS: [QuickReply, QuickReply, QuickReply] = [
  { id: 'snapshot', title: '📊 Get latest' },
  { id: 'low_stock', title: '📦 Low stock' },
  { id: 'revenue', title: '💰 Revenue' },
];

type IntentRule = {
  name: string;
  pattern: RegExp;
  reply: OutboundReply;
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
    reply: { body: GREETING_TEXT, buttons: MAIN_BUTTONS },
  },
  {
    name: 'help',
    pattern: /^(help|menu|options?|commands?|what can you do\??|capabilities)[\s!.?]*$/i,
    reply: { body: CAPABILITIES_TEXT, buttons: MAIN_BUTTONS },
  },
  {
    name: 'thanks',
    pattern: /^(thanks?|thank you|thx|ty|ok(ay)?|great|nice|cool|👍|🙏)[\s!.]*$/i,
    reply: { body: 'Anytime! 👍' },
  },
  {
    name: 'snapshot',
    // "snapshot", "summary", "overview", "report", "📊 Get latest", "📊 Snapshot"
    pattern:
      /^(snapshot|summary|overview|report|business\s+(?:report|overview|snapshot)|daily\s+(?:report|summary)|get\s+latest|📊\s*(?:snapshot|get\s+latest))[\s!.?]*$/i,
    reply: {
      body: 'Fetching your latest business snapshot… one moment.',
      buttons: SNAPSHOT_BUTTONS,
    },
  },
  {
    name: 'low_stock_shortcut',
    pattern: /^(📦\s*low\s+stock|low\s+stock\s+alert)[\s!.?]*$/i,
    reply: { body: 'Checking low-stock items for you…' },
  },
  {
    name: 'revenue_shortcut',
    pattern: /^(💰\s*revenue|revenue\s+details?)[\s!.?]*$/i,
    reply: { body: "Let me pull today's revenue numbers…" },
  },
];

@Injectable()
export class IntentService {
  /** Returns a structured reply (with optional quick-reply buttons) for trivial messages, or null to engage the AI. */
  match(text: string): OutboundReply | null {
    const normalized = text.trim();
    if (!normalized) return { body: CAPABILITIES_TEXT, buttons: MAIN_BUTTONS };
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) return rule.reply;
    }
    return null;
  }
}
