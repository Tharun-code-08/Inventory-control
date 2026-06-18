import type { BrandingSnapshotV1 } from '../branding/branding.types';

/**
 * PdfBrandingAdapter - Pure, stateless PDF branding application.
 *
 * SINGLE PUBLIC API: applyAllBranding(html, snapshot)
 *
 * RULES:
 * - NO database queries
 * - NO service calls
 * - NO Redis access
 * - NO constructor dependencies
 * - ONLY pure functions that transform HTML/PDF
 *
 * Input: HTML string + BrandingSnapshotV1
 * Output: HTML string with branding applied
 *
 * This ensures:
 * - Easy testing (no mocks needed)
 * - Easy engine migration (Puppeteer → other)
 * - Clear separation of concerns
 * - Centralized branding rules (all PDFs use same entry point)
 *
 * Usage in PDF services:
 * ```typescript
 * const htmlWithBranding = PdfBrandingAdapter.applyAllBranding(
 *   html,
 *   invoice.brandingSnapshot
 * );
 * ```
 */
export class PdfBrandingAdapter {
  /**
   * Apply company header with logo, name, GST, address
   * @private - Use applyAllBranding() instead
   */
  private static applyHeader(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showLogo) {
      // If logo not enabled, skip logo section
      html = html.replace(/<div class="logo-section">.*?<\/div>/s, '');
    } else if (snapshot.assets.logoUrl) {
      // Replace logo placeholder with actual logo
      html = html.replace(
        /\${logoUrl}/g,
        snapshot.assets.logoUrl
      );
    }

    // Replace company info placeholders
    html = html.replace(/\${companyName}/g, snapshot.company.name || '');
    html = html.replace(/\${address}/g, snapshot.company.address || '');
    html = html.replace(/\${phone}/g, snapshot.company.phone || '');
    html = html.replace(/\${email}/g, snapshot.company.email || '');

    // Conditionally show GST
    if (!snapshot.documentSettings.showGST) {
      html = html.replace(/<div class="gst-section">.*?<\/div>/s, '');
    } else {
      html = html.replace(
        /\${gstNumber}/g,
        snapshot.company.gstNumber || ''
      );
    }

    return html;
  }

  /**
   * Apply footer text
   * @private - Use applyAllBranding() instead
   */
  private static applyFooter(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showFooter) {
      html = html.replace(/<footer>.*?<\/footer>/s, '');
    } else if (snapshot.footerText) {
      html = html.replace(/\${footerText}/g, snapshot.footerText);
    }

    return html;
  }

  /**
   * Apply authorized signature if enabled
   * @private - Use applyAllBranding() instead
   */
  private static applySignature(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showSignature) {
      html = html.replace(/<div class="signature-section">.*?<\/div>/s, '');
    } else if (snapshot.assets.signatureUrl) {
      html = html.replace(
        /\${signatureUrl}/g,
        snapshot.assets.signatureUrl
      );
    }

    return html;
  }

  /**
   * Apply company seal/stamp if enabled
   * @private - Use applyAllBranding() instead
   */
  private static applySeal(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showSeal) {
      html = html.replace(/<div class="seal-section">.*?<\/div>/s, '');
    } else if (snapshot.assets.sealUrl) {
      html = html.replace(/\${sealUrl}/g, snapshot.assets.sealUrl);
    }

    return html;
  }

  /**
   * Apply theme colors (primary, secondary)
   * @private - Use applyAllBranding() instead
   */
  private static applyTheme(html: string, snapshot: BrandingSnapshotV1): string {
    if (snapshot.theme.primaryColor) {
      html = html.replace(
        /--primary-color: [^;]+;/g,
        `--primary-color: ${snapshot.theme.primaryColor};`
      );
    }

    if (snapshot.theme.secondaryColor) {
      html = html.replace(
        /--secondary-color: [^;]+;/g,
        `--secondary-color: ${snapshot.theme.secondaryColor};`
      );
    }

    return html;
  }

  /**
   * Apply all branding based on document settings.
   *
   * THIS IS THE ONLY PUBLIC API. All PDF services must use this method.
   *
   * This ensures branding rules are centralized and consistent across:
   * - Invoice PDF
   * - Purchase Order PDF
   * - Quotation PDF
   * - Goods Issue PDF
   * - Goods Receipt PDF
   * - E-Way Bill PDF
   * - Reports PDF
   *
   * Do NOT call applyHeader/Footer/Signature/Seal/Theme directly.
   */
  static applyAllBranding(html: string, snapshot: BrandingSnapshotV1): string {
    // Apply branding in explicit order (order matters for PDF layering)
    // Future additions: watermark, QR code, e-sign, branch footer, etc
    const brandingSteps: Array<(html: string, snap: BrandingSnapshotV1) => string> = [
      this.applyTheme, // CSS variables first (affects everything)
      this.applyHeader, // Company header with logo
      this.applyFooter, // Footer text
      this.applySignature, // Authorized signature
      this.applySeal, // Company seal/stamp
      // Next additions go here
    ];

    // Apply each step in order
    for (const step of brandingSteps) {
      html = step.call(this, html, snapshot);
    }

    return html;
  }
}
