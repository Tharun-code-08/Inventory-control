"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionWelcomeSubject = subscriptionWelcomeSubject;
exports.subscriptionWelcomeText = subscriptionWelcomeText;
exports.subscriptionWelcomeHtml = subscriptionWelcomeHtml;
const email_layout_template_1 = require("../email-layout.template");
const platform_email_shared_1 = require("./platform-email.shared");
function subscriptionWelcomeSubject(ctx) {
    return `Welcome to SoftdigitIMS ${ctx.planName} — your subscription is active`;
}
function subscriptionWelcomeText(ctx) {
    return [
        `Hi ${ctx.companyName},`,
        '',
        `Thank you for subscribing to SoftdigitIMS ${ctx.planName} (${ctx.billingCycle}).`,
        `Amount paid: ${ctx.amountDisplay}`,
        ctx.invoiceNumber ? `Invoice: ${ctx.invoiceNumber}` : '',
        '',
        'Your subscription is now active. Sign in to get started:',
        ctx.loginUrl,
        '',
        '— Softdigit Consulting',
    ]
        .filter(Boolean)
        .join('\n');
}
function subscriptionWelcomeHtml(ctx) {
    const bodyHtml = [
        (0, platform_email_shared_1.platformParagraph)(`Hi ${ctx.companyName},`),
        (0, platform_email_shared_1.platformParagraph)(`Thank you for subscribing to SoftdigitIMS ${ctx.planName} (${ctx.billingCycle}). Your payment of ${ctx.amountDisplay} was successful.`),
        ctx.invoiceNumber
            ? (0, platform_email_shared_1.platformParagraph)(`Your invoice ${ctx.invoiceNumber} is attached to this email.`)
            : '',
        (0, platform_email_shared_1.platformBenefitsList)([
            'Full inventory and warehouse management',
            'Purchase orders, RFQs, and supplier portal',
            'Sales orders, invoices, and payments',
            'Reports, backups, and team collaboration',
        ]),
        (0, platform_email_shared_1.platformCtaButton)({ label: 'Go to SoftdigitIMS', url: ctx.loginUrl }),
        (0, platform_email_shared_1.platformSupportFooter)(),
    ].join('');
    return (0, email_layout_template_1.wrapBusinessEmailHtml)({
        brandLabel: 'Softdigit Consulting',
        title: `Welcome to ${ctx.planName}`,
        subtitle: 'Your subscription is active',
        bodyHtml,
    });
}
//# sourceMappingURL=subscription-welcome.template.js.map