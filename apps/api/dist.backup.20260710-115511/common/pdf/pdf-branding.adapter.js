"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfBrandingAdapter = void 0;
class PdfBrandingAdapter {
    static applyHeader(html, snapshot) {
        if (!snapshot.documentSettings.showLogo) {
            html = html.replace(/<div class="logo-section">.*?<\/div>/s, '');
        }
        else if (snapshot.assets.logoUrl) {
            html = html.replace(/\${logoUrl}/g, snapshot.assets.logoUrl);
        }
        html = html.replace(/\${companyName}/g, snapshot.company.name || '');
        html = html.replace(/\${address}/g, snapshot.company.address || '');
        html = html.replace(/\${phone}/g, snapshot.company.phone || '');
        html = html.replace(/\${email}/g, snapshot.company.email || '');
        if (!snapshot.documentSettings.showGST) {
            html = html.replace(/<div class="gst-section">.*?<\/div>/s, '');
        }
        else {
            html = html.replace(/\${gstNumber}/g, snapshot.company.gstNumber || '');
        }
        return html;
    }
    static applyFooter(html, snapshot) {
        if (!snapshot.documentSettings.showFooter) {
            html = html.replace(/<footer>.*?<\/footer>/s, '');
        }
        else if (snapshot.footerText) {
            html = html.replace(/\${footerText}/g, snapshot.footerText);
        }
        return html;
    }
    static applySignature(html, snapshot) {
        if (!snapshot.documentSettings.showSignature) {
            html = html.replace(/<div class="signature-section">.*?<\/div>/s, '');
        }
        else if (snapshot.assets.signatureUrl) {
            html = html.replace(/\${signatureUrl}/g, snapshot.assets.signatureUrl);
        }
        return html;
    }
    static applySeal(html, snapshot) {
        if (!snapshot.documentSettings.showSeal) {
            html = html.replace(/<div class="seal-section">.*?<\/div>/s, '');
        }
        else if (snapshot.assets.sealUrl) {
            html = html.replace(/\${sealUrl}/g, snapshot.assets.sealUrl);
        }
        return html;
    }
    static applyTheme(html, snapshot) {
        if (snapshot.theme.primaryColor) {
            html = html.replace(/--primary-color: [^;]+;/g, `--primary-color: ${snapshot.theme.primaryColor};`);
        }
        if (snapshot.theme.secondaryColor) {
            html = html.replace(/--secondary-color: [^;]+;/g, `--secondary-color: ${snapshot.theme.secondaryColor};`);
        }
        return html;
    }
    static applyAllBranding(html, snapshot) {
        const brandingSteps = [
            this.applyTheme,
            this.applyHeader,
            this.applyFooter,
            this.applySignature,
            this.applySeal,
        ];
        for (const step of brandingSteps) {
            html = step.call(this, html, snapshot);
        }
        return html;
    }
}
exports.PdfBrandingAdapter = PdfBrandingAdapter;
//# sourceMappingURL=pdf-branding.adapter.js.map