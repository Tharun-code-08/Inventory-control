"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentService = exports.CAPABILITIES_REPLY = void 0;
const common_1 = require("@nestjs/common");
exports.CAPABILITIES_REPLY = [
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
    exports.CAPABILITIES_REPLY,
].join('\n');
const RULES = [
    {
        name: 'greeting',
        pattern: /^(hi+|hey+|hello+|namaste|hola|good\s+(morning|afternoon|evening))[\s!.,:;)]*$/i,
        reply: GREETING_REPLY,
    },
    {
        name: 'help',
        pattern: /^(help|menu|options?|commands?|what can you do\??|capabilities)[\s!.?]*$/i,
        reply: exports.CAPABILITIES_REPLY,
    },
    {
        name: 'thanks',
        pattern: /^(thanks?|thank you|thx|ty|ok(ay)?|great|nice|cool|👍|🙏)[\s!.]*$/i,
        reply: 'Anytime! 👍',
    },
];
let IntentService = class IntentService {
    match(text) {
        const normalized = text.trim();
        if (!normalized)
            return exports.CAPABILITIES_REPLY;
        for (const rule of RULES) {
            if (rule.pattern.test(normalized))
                return rule.reply;
        }
        return null;
    }
};
exports.IntentService = IntentService;
exports.IntentService = IntentService = __decorate([
    (0, common_1.Injectable)()
], IntentService);
//# sourceMappingURL=intent.service.js.map