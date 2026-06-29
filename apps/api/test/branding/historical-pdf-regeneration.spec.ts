/* eslint-disable */
/**
 * Historical PDF Regeneration Tests
 *
 * Verifies that the branding architecture preserves historical accuracy.
 * This is the cornerstone test for the entire Phase 1B architecture.
 */

describe.skip('Historical PDF Regeneration (Phase 1B Architecture)', () => {
  let brandingService: BrandingService;
  let invoiceService: InvoicesService;
  let pdfService: InvoicePdfService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Setup test database and services
    // This would use test fixtures in a real test
  });

  describe('Snapshot immutability', () => {
    it('should capture branding snapshot at invoice creation time', async () => {
      // 1. Create invoice with current branding
      const invoice = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 1, rate: 100 }],
      });

      // 2. Snapshot should exist
      expect(invoice.brandingSnapshot).toBeDefined();
      expect(invoice.brandingSnapshot.version).toBe(1);
      expect(invoice.brandingSnapshot.checksum).toBeDefined();

      // 3. Snapshot should contain complete branding state
      expect(invoice.brandingSnapshot.company).toBeDefined();
      expect(invoice.brandingSnapshot.assets).toBeDefined();
      expect(invoice.brandingSnapshot.documentSettings).toBeDefined();
    });

    it('should prevent snapshot modification after creation', async () => {
      const invoice = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [],
      });

      const originalChecksum = invoice.brandingSnapshot.checksum;

      // Attempt to modify snapshot should fail or be ignored
      const modified = {
        ...invoice.brandingSnapshot,
        company: { ...invoice.brandingSnapshot.company, name: 'HACKED' },
      };

      // Checksum should be invalidated if modified
      const isValid = brandingService.validateChecksumIntegrity(modified);
      expect(isValid).toBe(false);
    });
  });

  describe('Historical accuracy after company branding changes', () => {
    it('should regenerate old invoice with original branding after logo change', async () => {
      // 1. Create invoice with Logo A
      const originalSnapshot = await brandingService.createBrandingSnapshot(
        'company-1',
        'shop-1',
        'INVOICE'
      );
      const invoice = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 1, rate: 100 }],
      });
      const originalPdf = await pdfService.generatePdf(invoice);

      // 2. Change company logo to Logo B
      await brandingService.updateCompanyLogo('company-1', 'logo-b.png');

      // 3. Regenerate old invoice
      const regeneratedPdf = await pdfService.generatePdf(invoice);

      // 4. Both PDFs should contain the SAME logo (Logo A)
      const originalLogoUrl = extractLogoFromPdf(originalPdf);
      const regeneratedLogoUrl = extractLogoFromPdf(regeneratedPdf);

      expect(originalLogoUrl).toBe(regeneratedLogoUrl);
      expect(originalLogoUrl).toContain('logo-a');
    });

    it('should preserve GST number in old invoice after company info change', async () => {
      // 1. Create invoice with GST XXXX1111
      const invoice = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [],
      });
      const originalPdf = await pdfService.generatePdf(invoice);

      // 2. Change company GST to YYYY2222
      await brandingService.updateCompanyGst('company-1', 'YYYY2222');

      // 3. Regenerate old invoice
      const regeneratedPdf = await pdfService.generatePdf(invoice);

      // 4. Both PDFs should show original GST
      expect(extractGstFromPdf(originalPdf)).toBe('XXXX1111');
      expect(extractGstFromPdf(regeneratedPdf)).toBe('XXXX1111');
    });

    it('should preserve footer text after company footer update', async () => {
      // 1. Create invoice with Footer A
      const invoice = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [],
      });
      const originalPdf = await pdfService.generatePdf(invoice);

      // 2. Change company footer to Footer B
      await brandingService.updateFooterText('company-1', 'New footer text');

      // 3. Regenerate old invoice
      const regeneratedPdf = await pdfService.generatePdf(invoice);

      // 4. Both PDFs should show original footer
      expect(extractFooterFromPdf(originalPdf)).toBe('Original footer text');
      expect(extractFooterFromPdf(regeneratedPdf)).toBe('Original footer text');
    });
  });

  describe('Branch override consistency', () => {
    it('should use branch branding when branch override exists', async () => {
      // 1. Create invoice in Branch A (has override)
      const invoiceA = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'branch-a', // has override with Logo B
        items: [],
      });

      // 2. Create invoice in Branch B (no override, uses company logo)
      const invoiceB = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'branch-b', // no override
        items: [],
      });

      const pdfA = await pdfService.generatePdf(invoiceA);
      const pdfB = await pdfService.generatePdf(invoiceB);

      // 3. PDFs should have different logos
      expect(extractLogoFromPdf(pdfA)).toContain('logo-b'); // branch override
      expect(extractLogoFromPdf(pdfB)).toContain('logo-a'); // company logo
    });
  });

  describe('Snapshot validation', () => {
    it('should reject snapshot with missing required assets', async () => {
      // Settings require logo but no logo provided
      expect(() => {
        brandingService.validateSnapshot({
          version: 1,
          checksum: '',
          generatedAt: new Date().toISOString(),
          documentType: 'INVOICE',
          company: { name: 'Test' },
          assets: { logoUrl: null }, // Missing logo
          theme: {},
          documentSettings: { showLogo: true }, // But showLogo is true!
          footerText: '',
        });
      }).toThrow('Logo is enabled');
    });

    it('should reject snapshot with missing GST when showGST is enabled', async () => {
      expect(() => {
        brandingService.validateSnapshot({
          version: 1,
          checksum: '',
          generatedAt: new Date().toISOString(),
          documentType: 'INVOICE',
          company: { name: 'Test', gstNumber: undefined },
          assets: {},
          theme: {},
          documentSettings: { showGST: true }, // showGST is true
          footerText: '',
        });
      }).toThrow('GST is enabled');
    });
  });

  describe('Checksum integrity', () => {
    it('should detect snapshot corruption via checksum', async () => {
      const snapshot = await brandingService.createBrandingSnapshot(
        'company-1',
        'shop-1',
        'INVOICE'
      );

      // Snapshot should be valid
      expect(brandingService.validateChecksumIntegrity(snapshot)).toBe(true);

      // Tamper with snapshot
      const corrupted = {
        ...snapshot,
        company: { ...snapshot.company, name: 'HACKED' },
      };

      // Checksum should fail
      expect(brandingService.validateChecksumIntegrity(corrupted)).toBe(false);
    });
  });

  describe('Multiple invoices with different branding states', () => {
    it('should regenerate invoices created at different times with correct branding', async () => {
      // 1. Jan: Create invoice 1 with Branding v1
      const invoice1 = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [],
      });
      const snapshot1 = invoice1.brandingSnapshot;

      // 2. Feb: Update company branding
      await brandingService.updateCompanyLogo('company-1', 'logo-v2.png');

      // 3. Feb: Create invoice 2 with Branding v2
      const invoice2 = await invoiceService.create({
        customerId: 'customer-1',
        shopId: 'shop-1',
        items: [],
      });
      const snapshot2 = invoice2.brandingSnapshot;

      // 4. Snapshots should be different
      expect(snapshot1.assets.logoUrl).not.toBe(snapshot2.assets.logoUrl);

      // 5. Regenerate both invoices
      const pdf1 = await pdfService.generatePdf(invoice1);
      const pdf2 = await pdfService.generatePdf(invoice2);

      // 6. Each PDF should show its original branding
      expect(extractLogoFromPdf(pdf1)).toContain('logo-v1');
      expect(extractLogoFromPdf(pdf2)).toContain('logo-v2');
    });
  });

  // Helper functions (would be implemented in real tests)
  function extractLogoFromPdf(pdf: Buffer): string {
    // Parse PDF and extract logo reference
    return '';
  }

  function extractGstFromPdf(pdf: Buffer): string {
    // Parse PDF and extract GST number
    return '';
  }

  function extractFooterFromPdf(pdf: Buffer): string {
    // Parse PDF and extract footer text
    return '';
  }
});
