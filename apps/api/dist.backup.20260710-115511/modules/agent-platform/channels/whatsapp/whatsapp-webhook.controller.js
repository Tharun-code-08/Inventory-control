"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsAppWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../../../common/decorators/public.decorator");
const skip_envelope_decorator_1 = require("../../../../common/decorators/skip-envelope.decorator");
const conversation_service_1 = require("../../conversation/conversation.service");
const whatsapp_signature_util_1 = require("./whatsapp-signature.util");
let WhatsAppWebhookController = WhatsAppWebhookController_1 = class WhatsAppWebhookController {
    config;
    conversations;
    logger = new common_1.Logger(WhatsAppWebhookController_1.name);
    constructor(config, conversations) {
        this.config = config;
        this.conversations = conversations;
    }
    verify(mode, token, challenge) {
        const expected = this.config.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')?.trim();
        if (mode === 'subscribe' && expected && token === expected) {
            return challenge ?? '';
        }
        throw new common_1.ForbiddenException('Webhook verification failed');
    }
    async receive(req, signature) {
        const appSecret = this.config.get('WHATSAPP_APP_SECRET')?.trim() ?? '';
        if (!req.rawBody || !(0, whatsapp_signature_util_1.verifyMetaSignature)(req.rawBody, signature, appSecret)) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const payload = req.body;
        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                for (const message of change.value?.messages ?? []) {
                    if (message.type !== 'text' || !message.from || !message.text?.body)
                        continue;
                    try {
                        await this.conversations.handleInboundText({
                            waMessageId: message.id ?? '',
                            from: message.from,
                            text: message.text.body,
                            timestamp: message.timestamp
                                ? new Date(Number(message.timestamp) * 1000)
                                : undefined,
                        });
                    }
                    catch (err) {
                        this.logger.error(`Failed to process inbound message ${message.id ?? '<no id>'}: ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }
        }
        return { received: true };
    }
};
exports.WhatsAppWebhookController = WhatsAppWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, common_1.Get)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Meta webhook verify challenge' }),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", String)
], WhatsAppWebhookController.prototype, "verify", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Meta webhook receiver (signed)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-hub-signature-256')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "receive", null);
exports.WhatsAppWebhookController = WhatsAppWebhookController = WhatsAppWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Agent Platform'),
    (0, common_1.Controller)('agent-platform/whatsapp'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        conversation_service_1.ConversationService])
], WhatsAppWebhookController);
//# sourceMappingURL=whatsapp-webhook.controller.js.map