"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplateString = renderTemplateString;
exports.finalizeEmailHtml = finalizeEmailHtml;
exports.mergeTemplateContent = mergeTemplateContent;
const email_layout_template_1 = require("./email-layout.template");
const TEMPLATE_TITLES = {
    rfq_invite: 'Request for Quotation',
    purchase_order_supplier: 'Purchase Order',
    sales_quotation_customer: 'Sales Quotation',
    supplier_return_notice: 'Goods Return',
    invoice_created: 'Invoice',
    payment_received: 'Payment Received',
    payment_reminder: 'Payment Reminder',
    user_invite: 'User Invitation',
    goods_receipt_posted: 'Goods Receipt Posted',
};
function renderTemplateString(template, context) {
    return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key) => {
        const value = context[key.toLowerCase()] ?? context[key];
        if (value == null || value === '')
            return '';
        return String(value);
    });
}
function finalizeEmailHtml(bodyHtml, title, companyName) {
    if (/^\s*<!doctype/i.test(bodyHtml) || /^\s*<html/i.test(bodyHtml)) {
        return bodyHtml;
    }
    return (0, email_layout_template_1.wrapBusinessEmailHtml)({
        title,
        subtitle: companyName || undefined,
        bodyHtml,
    });
}
function stripHtmlToText(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function mergeTemplateContent(args) {
    const subjectSource = args.overrides?.subject?.trim() || args.subject;
    const textSource = args.overrides?.bodyText?.trim() || args.text;
    const htmlSource = args.overrides?.bodyHtml?.trim() || args.html;
    const layoutTitle = args.layoutTitle ??
        (args.templateId ? TEMPLATE_TITLES[args.templateId] : undefined) ??
        'Notification';
    const companyName = String(args.context.company_name ?? '');
    const renderedHtml = renderTemplateString(htmlSource, args.context);
    const renderedText = renderTemplateString(textSource, args.context);
    const html = finalizeEmailHtml(renderedHtml, layoutTitle, companyName);
    return {
        subject: renderTemplateString(subjectSource, args.context),
        text: renderedText || stripHtmlToText(html),
        html,
    };
}
//# sourceMappingURL=email-template.renderer.js.map