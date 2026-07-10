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
var WhatsAppAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
let WhatsAppAdapter = WhatsAppAdapter_1 = class WhatsAppAdapter {
    config;
    channel = client_1.ChatChannel.WHATSAPP;
    logger = new common_1.Logger(WhatsAppAdapter_1.name);
    constructor(config) {
        this.config = config;
    }
    isConfigured() {
        return Boolean(this.phoneNumberId() && this.accessToken());
    }
    async sendText(message) {
        return this.postMessage({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: message.to,
            type: 'text',
            text: { preview_url: false, body: message.body },
        });
    }
    async sendTemplate(message) {
        return this.postMessage({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: message.to,
            type: 'template',
            template: {
                name: message.name,
                language: { code: message.languageCode },
                ...(message.components && message.components.length
                    ? { components: message.components }
                    : {}),
            },
        });
    }
    async postMessage(body) {
        if (!this.isConfigured()) {
            throw new Error('WhatsApp adapter is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing)');
        }
        const url = `${this.apiUrl()}/${this.phoneNumberId()}/messages`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs());
        try {
            const res = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${this.accessToken()}`,
                },
                body: JSON.stringify(body),
            });
            const payload = (await res.json().catch(() => ({})));
            if (!res.ok) {
                throw new Error(`Meta send failed (${res.status}): ${payload.error?.message ?? 'unknown error'}`);
            }
            return { providerMessageId: payload.messages?.[0]?.id ?? null };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    apiUrl() {
        return (this.config.get('WHATSAPP_API_URL')?.trim().replace(/\/+$/, '') ||
            'https://graph.facebook.com/v20.0');
    }
    phoneNumberId() {
        return this.config.get('WHATSAPP_PHONE_NUMBER_ID')?.trim() ?? '';
    }
    accessToken() {
        return this.config.get('WHATSAPP_ACCESS_TOKEN')?.trim() ?? '';
    }
    timeoutMs() {
        return Number(this.config.get('NOTIFICATIONS_TIMEOUT_MS') ?? 5_000);
    }
};
exports.WhatsAppAdapter = WhatsAppAdapter;
exports.WhatsAppAdapter = WhatsAppAdapter = WhatsAppAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppAdapter);
//# sourceMappingURL=whatsapp.adapter.js.map