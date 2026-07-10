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
var RazorpayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const Razorpay = require('razorpay');
let RazorpayService = RazorpayService_1 = class RazorpayService {
    config;
    logger = new common_1.Logger(RazorpayService_1.name);
    client = null;
    constructor(config) {
        this.config = config;
    }
    isConfigured() {
        return Boolean(this.keyId() && this.keySecret());
    }
    keyId() {
        return this.config.get('RAZORPAY_KEY_ID')?.trim() || undefined;
    }
    keySecret() {
        return this.config.get('RAZORPAY_KEY_SECRET')?.trim() || undefined;
    }
    getClient() {
        const keyId = this.keyId();
        const keySecret = this.keySecret();
        if (!keyId || !keySecret) {
            throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
        }
        if (!this.client) {
            this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
        }
        return this.client;
    }
    async createOrder(args) {
        if (args.amountPaise < 100) {
            throw new Error('Amount must be at least 100 paise');
        }
        const client = this.getClient();
        try {
            const order = await client.orders.create({
                amount: args.amountPaise,
                currency: args.currency ?? 'INR',
                receipt: args.receipt,
            });
            return {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
            };
        }
        catch (err) {
            this.logger.error(`Razorpay create order failed: ${err.message}`);
            throw err;
        }
    }
    verifyPaymentSignature(args) {
        const secret = this.keySecret();
        if (!secret)
            return false;
        const body = `${args.orderId}|${args.paymentId}`;
        const expected = (0, crypto_1.createHmac)('sha256', secret).update(body).digest('hex');
        return expected === args.signature;
    }
    verifyWebhookSignature(body, signature) {
        const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET')?.trim();
        if (!secret || !signature)
            return false;
        const expected = (0, crypto_1.createHmac)('sha256', secret).update(body).digest('hex');
        return expected === signature;
    }
    async createSubscription(_args) {
        void _args;
        if (!this.isConfigured())
            return null;
        this.logger.warn('Razorpay Subscriptions API not yet enabled — use manual renewal checkout');
        return null;
    }
};
exports.RazorpayService = RazorpayService;
exports.RazorpayService = RazorpayService = RazorpayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RazorpayService);
//# sourceMappingURL=razorpay.service.js.map