import type { BrandingSnapshotV1 } from '../branding/branding.types';

/**
 * PdfBrandingAdapter - Pure, stateless PDF branding application.
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
 */
export class PdfBrandingAdapter {
  /**
   * Apply company header with logo, name, GST, address
   */
  static applyHeader(html: string, snapshot: BrandingSnapshotV1): string {
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
   */
  static applyFooter(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showFooter) {
      html = html.replace(/<footer>.*?<\/footer>/s, '');
    } else if (snapshot.footerText) {
      html = html.replace(/\${footerText}/g, snapshot.footerText);
    }

    return html;
  }

  /**
   * Apply authorized signature if enabled
   */
  static applySignature(html: string, snapshot: BrandingSnapshotV1): string {
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
   */
  static applySeal(html: string, snapshot: BrandingSnapshotV1): string {
    if (!snapshot.documentSettings.showSeal) {
      html = html.replace(/<div class="seal-section">.*?<\/div>/s, '');
    } else if (snapshot.assets.sealUrl) {
      html = html.replace(/\${sealUrl}/g, snapshot.assets.sealUrl);
    }

    return html;
  }

  /**
   * Apply theme colors (primary, secondary)
   */
  static applyTheme(html: string, snapshot: BrandingSnapshotV1): string {
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
   * Apply all branding based on document settings
   */
  static applyAllBranding(html: string, snapshot: BrandingSnapshotV1): string {
    // Apply in order: header, footer, signature, seal, theme
    html = this.applyHeader(html, snapshot);
    html = this.applyFooter(html, snapshot);
    html = this.applySignature(html, snapshot);
    html = this.applySeal(html, snapshot);
    html = this.applyTheme(html, snapshot);

    return html;
  }
}
