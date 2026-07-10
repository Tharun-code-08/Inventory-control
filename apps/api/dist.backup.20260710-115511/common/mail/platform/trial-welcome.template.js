"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trialWelcomeSubject = trialWelcomeSubject;
exports.trialWelcomeText = trialWelcomeText;
exports.trialWelcomeHtml = trialWelcomeHtml;
const email_layout_template_1 = require("../email-layout.template");
const platform_email_shared_1 = require("./platform-email.shared");
function trialWelcomeSubject(ctx) {
    return `Welcome to SoftdigitIMS — your ${ctx.trialDays}-day trial starts now`;
}
function trialWelcomeText(ctx) {
    return [
        `Hi ${ctx.companyName},`,
        '',
        `Your SoftdigitIMS trial is active for ${ctx.trialDays} days (ends ${ctx.trialEndsAt}).`,
        '',
        'Sign in:',
        ctx.loginUrl,
        '',
        'Upgrade anytime:',
        ctx.upgradeUrl,
        '',
        '— Softdigit Consulting',
    ].join('\n');
}
function trialWelcomeHtml(ctx) {
    const bodyHtml = [
        (0, platform_email_shared_1.platformParagraph)(`Hi ${ctx.companyName},`),
        (0, platform_email_shared_1.platformParagraph)(`Welcome to SoftdigitIMS! Your free trial is active for ${ctx.trialDays} days and ends on ${ctx.trialEndsAt}.`),
        (0, platform_email_shared_1.platformBenefitsList)([
            'Set up products and track stock across warehouses',
            'Create purchase orders and receive goods',
            'Run sales orders and issue invoices',
            'Invite your team and explore reports',
        ]),
        (0, platform_email_shared_1.platformCtaButton)({ label: 'Start using SoftdigitIMS', url: ctx.loginUrl }),
        (0, platform_email_shared_1.platformParagraph)('Ready to commit? Upgrade anytime from your billing settings.'),
        (0, platform_email_shared_1.platformCtaButton)({ label: 'View plans', url: ctx.upgradeUrl }),
        (0, platform_email_shared_1.platformSupportFooter)(ctx.unsubscribeUrl),
    ].join('');
    return (0, email_layout_template_1.wrapBusinessEmailHtml)({
        brandLabel: 'Softdigit Consulting',
        title: 'Your trial has started',
        subtitle: `${ctx.trialDays} days of full access`,
        bodyHtml,
    });
}
//# sourceMappingURL=trial-welcome.template.js.map