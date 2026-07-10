export type PlatformEmailCta = {
    label: string;
    url: string;
};
export declare function platformCtaButton(cta: PlatformEmailCta): string;
export declare function platformBenefitsList(items: string[]): string;
export declare function platformSupportFooter(unsubscribeUrl?: string): string;
export declare function platformParagraph(text: string): string;
