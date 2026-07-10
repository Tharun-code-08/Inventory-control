export type BusinessEmailLayoutContent = {
    title: string;
    subtitle?: string;
    bodyHtml: string;
    brandLabel?: string;
    maxWidthPx?: number;
    supportEmail?: string;
    footerNote?: string;
};
export declare function wrapBusinessEmailHtml(content: BusinessEmailLayoutContent): string;
