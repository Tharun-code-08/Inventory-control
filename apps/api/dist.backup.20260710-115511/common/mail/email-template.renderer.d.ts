export type TemplateContext = Record<string, string | number | null | undefined>;
export declare function renderTemplateString(template: string, context: TemplateContext): string;
export declare function finalizeEmailHtml(bodyHtml: string, title: string, companyName: string): string;
export declare function mergeTemplateContent(args: {
    subject: string;
    text: string;
    html: string;
    overrides?: {
        subject?: string;
        bodyText?: string;
        bodyHtml?: string;
    };
    context: TemplateContext;
    layoutTitle?: string;
    templateId?: string;
}): {
    subject: string;
    text: string;
    html: string;
};
