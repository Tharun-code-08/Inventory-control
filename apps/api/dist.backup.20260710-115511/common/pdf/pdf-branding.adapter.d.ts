import type { BrandingSnapshotV1 } from '../branding/branding.types';
export declare class PdfBrandingAdapter {
    private static applyHeader;
    private static applyFooter;
    private static applySignature;
    private static applySeal;
    private static applyTheme;
    static applyAllBranding(html: string, snapshot: BrandingSnapshotV1): string;
}
