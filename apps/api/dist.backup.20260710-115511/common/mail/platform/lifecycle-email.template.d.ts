import { type PlatformEmailCta } from './platform-email.shared';
export type LifecycleEmailContent = {
    title: string;
    subtitle?: string;
    greeting: string;
    paragraphs: string[];
    bullets?: string[];
    cta?: PlatformEmailCta;
    secondaryCta?: PlatformEmailCta;
    unsubscribeUrl?: string;
    transactional?: boolean;
};
export declare function lifecycleEmailSubject(title: string, companyName?: string): string;
export declare function lifecycleEmailText(content: LifecycleEmailContent): string;
export declare function lifecycleEmailHtml(content: LifecycleEmailContent): string;
