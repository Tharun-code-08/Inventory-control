"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleEmailSubject = lifecycleEmailSubject;
exports.lifecycleEmailText = lifecycleEmailText;
exports.lifecycleEmailHtml = lifecycleEmailHtml;
const email_layout_template_1 = require("../email-layout.template");
const platform_email_shared_1 = require("./platform-email.shared");
function lifecycleEmailSubject(title, companyName) {
    return companyName ? `${title} — ${companyName}` : title;
}
function lifecycleEmailText(content) {
    const lines = [content.greeting, '', ...content.paragraphs];
    if (content.bullets?.length) {
        lines.push('', ...content.bullets.map((b) => `• ${b}`));
    }
    if (content.cta) {
        lines.push('', content.cta.label, content.cta.url);
    }
    lines.push('', '— Softdigit Consulting');
    return lines.join('\n');
}
function lifecycleEmailHtml(content) {
    const bodyHtml = [
        (0, platform_email_shared_1.platformParagraph)(content.greeting),
        ...content.paragraphs.map((p) => (0, platform_email_shared_1.platformParagraph)(p)),
        content.bullets?.length ? (0, platform_email_shared_1.platformBenefitsList)(content.bullets) : '',
        content.cta ? (0, platform_email_shared_1.platformCtaButton)(content.cta) : '',
        content.secondaryCta ? (0, platform_email_shared_1.platformCtaButton)(content.secondaryCta) : '',
        (0, platform_email_shared_1.platformSupportFooter)(content.transactional ? undefined : content.unsubscribeUrl),
    ].join('');
    return (0, email_layout_template_1.wrapBusinessEmailHtml)({
        brandLabel: 'Softdigit Consulting',
        title: content.title,
        subtitle: content.subtitle,
        bodyHtml,
    });
}
//# sourceMappingURL=lifecycle-email.template.js.map