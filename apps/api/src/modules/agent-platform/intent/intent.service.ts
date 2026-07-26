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
  '*🔔 Notifications*',
  '- "Stop daily summary"',
  '- "Enable low stock alerts"',
  '- "Notification settings"',
  '',
  'Just ask in plain language!',
].join('\n');

/** @deprecated alias kept for backward compat */
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

type IntentRule = { name: string; pattern: RegExp; reply: OutboundReply };

/**
 * Rule tier: deterministic, free, instant. Returns an OutboundReply (with optional
 * quick-reply buttons) or null to engage the AI. Keep patterns anchored/tight.
 *
 * Button IDs tapped by the user arrive here as raw strings (e.g. "snapshot",
 * "low_stock"). Most pass through to the AI for real data; "help" is answered here.
 * Notification commands are handled upstream in NotificationCommandService.
 */
const RULES: IntentRule[] = [
  {
    name: 'greeting',
    pattern: /^(hi+|hey+|hello+|namaste|hola|good\s+(morning|afternoon|evening))[\s!.,:;)]*$/i,
    reply: { body: GREETING_TEXT, buttons: MAIN_BUTTONS },
  },
  {
    name: 'help',
    // Also matches the "help" button ID
    pattern: /^(help|menu|options?|commands?|what can you do\??|capabilities)[\s!.?]*$/i,
    reply: { body: CAPABILITIES_TEXT, buttons: MAIN_BUTTONS },
  },
  {
    name: 'thanks',
    pattern: /^(thanks?|thank you|thx|ty|ok(ay)?|great|nice|cool|👍|🙏)[\s!.]*$/i,
    reply: { body: 'Anytime! 👍' },
  },
  {
    name: 'low_stock_shortcut',
    // Matches the "low_stock" button ID (underscore form) and natural language
    pattern: /^(low_stock|📦\s*low\s+stock|low\s+stock\s+alert)[\s!.?]*$/i,
    reply: { body: 'Checking low-stock items for you…' },
  },
  {
    name: 'revenue_shortcut',
    // Matches the "revenue" button ID and natural variants
    pattern: /^(revenue|💰\s*revenue|revenue\s+details?)[\s!.?]*$/i,
    reply: { body: "Pulling today's revenue numbers…" },
  },
];

/**
 * Button IDs that should be translated to natural-language queries and passed
 * to the AI. The AI uses real ERP tools to answer them with live data.
 */
export const BUTTON_ID_TO_QUERY: Record<string, string> = {
  snapshot: 'Give me a business snapshot with today\'s new orders, total revenue, low stock count, and overdue invoice count.',
  low_stock: 'Show me all items that are below their minimum stock level.',
  revenue: "What is my total sales revenue for today? Include number of orders.",
  overdue: 'Show me overdue customer invoices — total overdue amount and which customers owe the most.',
  create_po: 'I want to create a purchase order.',
  create_so: 'I want to create a sales order.',
};

@Injectable()
export class IntentService {
  /** Returns a structured reply (with optional quick-reply buttons) or null to engage the AI. */
  match(text: string): OutboundReply | null {
    const normalized = text.trim();
    if (!normalized) return { body: CAPABILITIES_TEXT, buttons: MAIN_BUTTONS };
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) return rule.reply;
    }
    return null;
  }

  /**
   * Translate a button ID to a natural-language query the AI can handle.
   * Returns the original text unchanged if it's not a known button ID.
   */
  resolveButtonId(text: string): string {
    return BUTTON_ID_TO_QUERY[text.trim()] ?? text;
  }
}
