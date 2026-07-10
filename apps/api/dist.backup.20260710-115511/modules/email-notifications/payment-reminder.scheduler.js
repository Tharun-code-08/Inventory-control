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
var PaymentReminderScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReminderScheduler = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const payment_reminder_constants_1 = require("./payment-reminder.constants");
let PaymentReminderScheduler = PaymentReminderScheduler_1 = class PaymentReminderScheduler {
    queue;
    logger = new common_1.Logger(PaymentReminderScheduler_1.name);
    constructor(queue) {
        this.queue = queue;
    }
    async registerRepeatableJob() {
        await this.queue.add('daily-payment-reminders', {}, {
            repeat: { pattern: '0 8 * * *' },
            jobId: 'daily-payment-reminders',
            removeOnComplete: 20,
            removeOnFail: 20,
        });
        this.logger.log('Scheduled daily payment reminder job (08:00 UTC)');
    }
};
exports.PaymentReminderScheduler = PaymentReminderScheduler;
exports.PaymentReminderScheduler = PaymentReminderScheduler = PaymentReminderScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(payment_reminder_constants_1.PAYMENT_REMINDER_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], PaymentReminderScheduler);
//# sourceMappingURL=payment-reminder.scheduler.js.map