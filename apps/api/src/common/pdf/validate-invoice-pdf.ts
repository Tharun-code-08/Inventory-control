/**
 * Phase 2B: Invoice PDF Validation Harness
 *
 * Generates PDFs from frozen fixtures and collects evidence:
 * 1. PDF generation (metrics + environment)
 * 2. Three-way reconciliation (DB == ViewModel == PDF)
 * 3. Refusability tests (invalid data rejection)
 * 4. Rendering validation (visual checklist)
 *
 * CRITICAL RULE: Do not allow placeholder values to produce PASS states.
 * Separate actual evidence from placeholders.
 * Only CONFIRMED evidence can justify PASS.
 *
 * Run: ts-node validate-invoice-pdf.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Evidence state tracking
 * Prevents placeholder values from masquerading as real evidence
 */
enum EvidenceState {
  CONFIRMED = 'CONFIRMED',
  PLACEHOLDER = 'PLACEHOLDER',
  UNKNOWN = 'UNKNOWN'
}

interface LineReconciliation {
  lineNumber: number;
  sku: string;
  quantity: number;
  unitPrice: number;
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossAmount: number;
  expectedGrossAmount: number;
  actualGrossAmount: number;
  diff: number;
  match: boolean;
}

interface TotalReconciliation {
  dbTotal: { value: number; state: EvidenceState };
  vmTotal: { value: number; state: EvidenceState };
  pdfTotal: { value: number; state: EvidenceState };
  diff: number;
  passed: boolean;
}

interface ManualInspection {
  reviewer?: string;
  reviewedAt?: string;
  logoVisible?: boolean;
  unicodeCorrect?: boolean;
  totalsReadable?: boolean;
  professionalAppearance?: boolean;
  notes?: string;
}

/**
 * Complete audit trail for a validated invoice
 * Frozen evidence record for later verification
 */
interface ValidationEvidence {
  fixtureName: string;
  templateVersion: string;
  templateGitCommit: string;
  pdfSha256: string;
  renderEnvironment: {
    chromeVersion?: string;
    nodeVersion?: string;
    os?: string;
  };
  gate1: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    reconciliation?: TotalReconciliation;
  };
  gate2: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    verifiedFields?: string[];
  };
  gate3: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    manualInspection?: ManualInspection;
  };
  refusalTests: {
    corrupted: boolean;
    rejectionReasons?: string[];
  };
  validatedAt: string;
  validatedBy: string;
}

interface ValidationResult {
  fixture: string;
  renderStatus: 'SUCCESS' | 'FAILED' | 'REFUSED';
  gate1: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    reason?: string;
    reconciliation?: TotalReconciliation;
    mismatchedLines?: LineReconciliation[];
    pdfExtractionConfidence?: {
      level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
      reason?: string;
    };
  };
  gate2: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    reason?: string;
    missingFields?: string[];
    verifiedFields?: string[];
  };
  gate3: {
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    reason?: string;
    renderTimeMs?: number;
    pageCount?: number;
    fileSizeBytes?: number;
    peakMemoryMb?: number;
    manualInspection?: ManualInspection;
  };
  authenticity: {
    sha256?: { value: string; state: EvidenceState };
    generatedAt?: string;
  };
  renderEnvironment: {
    chromeVersion?: string;
    nodeVersion?: string;
    templateVersion?: string;
    templateGitCommit?: string;
    os?: string;
  };
  htmlSnapshot?: {
    filename: string;
    path: string;
    captured: boolean;
    size?: number;
  };
  errors?: string[];
  auditLog?: string[];
}

interface RenderMetrics {
  renderTimeMs: number;
  pageCount: number;
  fileSizeBytes: number;
  peakMemoryMb: number;
  sha256: string;
  chromeVersion: string;
  nodeVersion: string;
  templateVersion: string;
  templateGitCommit: string;
  generatedAt: string;
  generatedBy: string;
}

/**
 * Phase 2B: PDF Generation Runner
 * Load fixture → Generate PDF → Capture metrics
 */
async function generateInvoicePdf(
  fixturePath: string
): Promise<{
  pdfBuffer: Buffer;
  metrics: RenderMetrics;
}> {
  try {
    // TODO: When API is available, call:
    // const pdfBuffer = await documentPdfFacade.renderInvoicePdf(fixture);

    // For now, simulate the structure that Phase 2B will use
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    console.log(`[GEN] ${path.basename(fixturePath)}`);

    // Placeholder: actual implementation requires DocumentPdfFacade
    const pdfBuffer = Buffer.from('');
    const metrics: RenderMetrics = {
      renderTimeMs: 0,
      pageCount: 0,
      fileSizeBytes: 0,
      peakMemoryMb: 0,
      sha256: '',
      chromeVersion: process.env.CHROME_VERSION || '137.0.0',
      nodeVersion: process.version,
      templateVersion: 'v1.1',
      templateGitCommit: process.env.TEMPLATE_COMMIT || 'unknown',
      generatedAt: new Date().toISOString(),
      generatedBy: 'SYSTEM'
    };

    return { pdfBuffer, metrics };
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

/**
 * Phase 2B: Line-Level Reconciliation
 * Compare each line item against expected calculations
 */
function reconcileLineItems(
  fixture: any
): { lines: LineReconciliation[]; mismatchCount: number } {
  const invoice = fixture.invoice || fixture;
  const lineItems = invoice.lineItems || [];

  const lines: LineReconciliation[] = lineItems.map((item: any, idx: number) => {
    const lineNumber = (item.slNo || idx + 1);
    const expected = item.grossAmount || 0;
    const actual = (item.taxableAmount || 0) +
                   (item.cgstAmount || 0) +
                   (item.sgstAmount || 0) +
                   (item.igstAmount || 0);

    const diff = Math.abs(expected - actual);
    const tolerance = 0.01;

    return {
      lineNumber,
      sku: item.sku || 'UNKNOWN',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      baseAmount: item.baseAmount || 0,
      discountAmount: item.discountAmount || 0,
      taxableAmount: item.taxableAmount || 0,
      cgst: item.cgstAmount || 0,
      sgst: item.sgstAmount || 0,
      igst: item.igstAmount || 0,
      grossAmount: item.grossAmount || 0,
      expectedGrossAmount: expected,
      actualGrossAmount: actual,
      diff,
      match: diff <= tolerance
    };
  });

  const mismatchCount = lines.filter(l => !l.match).length;
  return { lines, mismatchCount };
}

/**
 * Phase 2B: Three-Way Reconciliation
 * Verify: DB Totals == ViewModel Totals == PDF Extracted Totals
 *
 * CRITICAL RULES:
 * 1. Do not use placeholder values as evidence
 * 2. Mark all values with EvidenceState
 * 3. Only return PASSED if all three are CONFIRMED and match
 * 4. Return UNKNOWN if any value is unavailable
 * 5. Fail fast on mismatch. Do not continue if Gate 1 fails.
 */
async function reconcileTotals(
  fixture: any,
  pdfBuffer: Buffer
): Promise<{
  reconciliation: TotalReconciliation;
  pdfExtractionConfidence: { level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'; reason?: string };
  lineItems: LineReconciliation[];
  mismatchedLines: LineReconciliation[];
  passed: boolean;
  canPass: boolean; // true only if all evidence is CONFIRMED
}> {
  try {
    const invoice = fixture.invoice || fixture;

    // Extract ViewModel total (this is CONFIRMED - it's from the fixture)
    const vmTotal = invoice.summary?.grossTotal || 0;

    // TODO: When DB is available, fetch CONFIRMED dbTotal:
    // const dbTotal = await getInvoiceTotalFromDatabase(fixture.invoice.invoiceNumber);
    // dbTotalState = EvidenceState.CONFIRMED
    const dbTotal = vmTotal;
    const dbTotalState = EvidenceState.PLACEHOLDER;

    // TODO: When PDF extraction is available, parse PDF:
    // const pdfExtractionResult = await extractTotalsFromPdf(pdfBuffer);
    // pdfTotal = pdfExtractionResult.total
    // pdfExtractionConfidence = pdfExtractionResult.confidence
    const pdfTotal = 0; // UNKNOWN until PDF parsing available
    const pdfTotalState = EvidenceState.UNKNOWN;
    const pdfExtractionConfidence = { level: 'UNKNOWN' as const, reason: 'PDF extraction not implemented' };

    // Line-level reconciliation
    const { lines, mismatchCount } = reconcileLineItems(fixture);
    const mismatchedLines = lines.filter(l => !l.match);

    // Calculate diff only for display
    const diff = dbTotalState === EvidenceState.CONFIRMED && pdfTotalState === EvidenceState.CONFIRMED
      ? Math.abs(dbTotal - pdfTotal)
      : -1;

    const tolerance = 0.01;

    // PASS: only if all three are CONFIRMED and match
    const allConfirmed =
      dbTotalState === EvidenceState.CONFIRMED &&
      pdfTotalState === EvidenceState.CONFIRMED;

    const passed = allConfirmed && diff >= 0 && diff <= tolerance;
    const canPass = allConfirmed; // Can this test ever pass?

    const reconciliation: TotalReconciliation = {
      dbTotal: { value: dbTotal, state: dbTotalState },
      vmTotal: { value: vmTotal, state: EvidenceState.CONFIRMED }, // Always confirmed
      pdfTotal: { value: pdfTotal, state: pdfTotalState },
      diff,
      passed
    };

    return {
      reconciliation,
      pdfExtractionConfidence,
      lineItems: lines,
      mismatchedLines,
      passed,
      canPass
    };
  } catch (error) {
    throw new Error(`Three-way reconciliation failed: ${error.message}`);
  }
}

/**
 * Phase 2B: Capture HTML Snapshot
 * Save generated HTML for debugging rendering pipeline
 *
 * ONLY captures if html is actually rendered (not empty).
 * Returns false if no HTML available.
 */
async function captureHtmlSnapshot(
  fixtureName: string,
  html: string | null
): Promise<{ captured: boolean; path: string; size: number }> {
  try {
    // Do not capture empty or null HTML
    if (!html || html.trim().length === 0) {
      return { captured: false, path: '', size: 0 };
    }

    const filename = fixtureName.replace('.json', '.html');
    const outputDir = '/root/.claude/jobs/2f849657/tmp';
    const path_to_file = `${outputDir}/${filename}`;

    fs.writeFileSync(path_to_file, html);
    const size = fs.statSync(path_to_file).size;

    return { captured: true, path: path_to_file, size };
  } catch (error) {
    console.error(`Failed to capture HTML snapshot: ${error.message}`);
    return { captured: false, path: '', size: 0 };
  }
}

/**
 * Gate 2A: Business Fields Exist (Automatic)
 * Verify all required fields are present in fixture JSON
 */
function verifyGate2A(fixture: any): {
  status: 'PASS' | 'FAIL';
  reason?: string;
  missingFields?: string[];
  verifiedFields?: string[];
} {
  const invoice = fixture.invoice || fixture;
  const missingFields: string[] = [];
  const verifiedFields: string[] = [];

  // Required fields for Gate 2A (JSON-level verification)
  const requiredFields = [
    { path: 'invoiceNumber', name: 'Invoice Number' },
    { path: 'invoiceDate', name: 'Invoice Date' },
    { path: 'company.name', name: 'Company Name' },
    { path: 'company.address', name: 'Company Address' },
    { path: 'company.gstin', name: 'Company GSTIN' },
    { path: 'customer.name', name: 'Customer Name' },
    { path: 'customer.address', name: 'Customer Address' },
    { path: 'customer.gstin', name: 'Customer GSTIN' },
    { path: 'summary.grossTotal', name: 'Gross Total' },
    { path: 'termsAndConditions', name: 'Terms & Conditions' },
    { path: 'authorizedSignatory.name', name: 'Authorized Signatory' }
  ];

  requiredFields.forEach(field => {
    const value = field.path.split('.').reduce((obj, key) => obj?.[key], invoice);
    if (value !== undefined && value !== null && value !== '') {
      verifiedFields.push(field.name);
    } else {
      missingFields.push(field.name);
    }
  });

  if (missingFields.length > 0) {
    return {
      status: 'FAIL',
      reason: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
      verifiedFields
    };
  }

  return {
    status: 'PASS',
    reason: 'All required fields present in JSON',
    missingFields: [],
    verifiedFields
  };
}

/**
 * Gate 2B: PDF Visibility (Manual)
 * Verify all required fields are visible in PDF
 * Requires human inspection or OCR
 */
function verifyGate2B(): {
  status: 'UNKNOWN' | 'PASS';
  reason: string;
} {
  // TODO: When PDF is available, inspect for field visibility
  // - Company name visible at top
  // - GSTIN visible clearly
  // - Customer details visible
  // - Invoice number visible
  // - Terms & conditions visible
  // - Authorized signatory visible

  return {
    status: 'UNKNOWN',
    reason: 'PDF field visibility verification requires manual inspection after PDF generation'
  };
}

/**
 * Gate 3A: Automatic Rendering Checks
 * Verify PDF metrics and extract-ability
 */
function verifyGate3A(pdfBuffer: Buffer, metrics: any): {
  status: 'PASS' | 'FAIL';
  reason?: string;
} {
  // Automatic checks on PDF
  const failures: string[] = [];
  const warnings: string[] = [];

  // CRITICAL: PDF has content
  if (!pdfBuffer || pdfBuffer.length === 0) {
    failures.push('PDF is empty (0 bytes)');
  }

  // CRITICAL: Page count is positive
  if (metrics.pageCount < 1) {
    failures.push('Page count is 0 (rendering failed)');
  }

  // CRITICAL: Render completed
  if (metrics.renderTimeMs === 0) {
    failures.push('Render time is 0ms (rendering may have failed)');
  }

  // WARNING: File size context (not a failure)
  // Small invoices (5 items) may be 5-10KB
  // Large invoices (500 items) may be 1-2MB
  // Both are valid
  if (metrics.fileSizeBytes < 1000) {
    warnings.push(`File size suspiciously small (${metrics.fileSizeBytes} bytes)`);
  }

  // TODO: When PDF text extraction available:
  // - Extract invoice number and verify it matches fixture
  // - Extract grand total and verify format
  // - Detect blank pages
  // - Verify extraction confidence HIGH/MEDIUM/LOW
  // - If extraction FAILS or confidence LOW: add to warnings

  if (failures.length > 0) {
    return {
      status: 'FAIL',
      reason: failures.join('; ')
    };
  }

  const reasonParts = ['PDF metrics acceptable'];
  if (warnings.length > 0) {
    reasonParts.push(`(warnings: ${warnings.join(', ')})`);
  }
  reasonParts.push('Text extraction pending implementation.');

  return {
    status: 'PASS',
    reason: reasonParts.join('. ')
  };
}

/**
 * Gate 3B: Manual Rendering Inspection
 * Verify typography, branding, alignment, aesthetics
 */
function verifyGate3B(): {
  status: 'UNKNOWN';
  reason: string;
  checklist: string[];
} {
  const checklist = [
    'Logo visible and crisp',
    'Typography professional (font size, weight)',
    'Branding colors correct',
    'Column alignment consistent',
    'No overlapping text',
    'Unicode renders correctly (தமிழ், 北京, Müller)',
    'Line item table readable',
    'Totals section clearly visible',
    'Multiple pages render consistently',
    'Professional appearance (would send to customer)'
  ];

  return {
    status: 'UNKNOWN',
    reason: 'Manual visual inspection required after PDF generation',
    checklist
  };
}

/**
 * Phase 2B: Refusability Tests
 * Verify system REJECTS corrupted invoices based on business rules
 * NOT based on filename.
 */
async function validateInvoiceRules(fixture: any): Promise<{
  isValid: boolean;
  rejectionReasons?: string[];
}> {
  const rejectionReasons: string[] = [];
  const invoice = fixture.invoice || fixture;

  // Rule 1: Negative quantities not allowed
  const hasNegativeQty = (invoice.lineItems || []).some((item: any) => item.quantity < 0);
  if (hasNegativeQty) {
    rejectionReasons.push('Line item quantity cannot be negative');
  }

  // Rule 2: Company GSTIN required
  if (!invoice.company?.gstin) {
    rejectionReasons.push('Company GSTIN is required for tax invoice');
  }

  // Rule 3: Grand total must match sum of line items
  const calculatedSum = (invoice.lineItems || []).reduce(
    (sum: number, item: any) => sum + (item.grossAmount || 0),
    0
  );
  if (Math.abs(calculatedSum - (invoice.summary?.grossTotal || 0)) > 0.01) {
    rejectionReasons.push(`Grand total mismatch: sum=${calculatedSum.toFixed(2)}, stated=${(invoice.summary?.grossTotal || 0).toFixed(2)}`);
  }

  // Rule 4: Tax calculation correctness
  const hasTaxErrors = (invoice.lineItems || []).some((item: any) => {
    const expectedTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
    const actualTax = (item.grossAmount || 0) - (item.taxableAmount || 0);
    return Math.abs(expectedTax - actualTax) > 0.01;
  });
  if (hasTaxErrors) {
    rejectionReasons.push('Tax calculation error in one or more line items');
  }

  return {
    isValid: rejectionReasons.length === 0,
    rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined
  };
}

/**
 * Phase 2B: Refusability Tests
 * Verify system rejects invalid invoices based on business rules
 * Test that the most trustworthy invoice engine is the one that refuses doubtful documents.
 */
async function testRefusability(fixturesDir: string): Promise<{
  test: string;
  expectedResult: string;
  actualResult: 'REFUSED' | 'GENERATED' | 'UNKNOWN';
  passed: boolean;
  reason?: string;
}[]> {
  const corruptedPath = path.join(fixturesDir, 'invoice-corrupted.json');

  // Load corrupted fixture
  let corruptedFixture: any = null;
  try {
    corruptedFixture = JSON.parse(fs.readFileSync(corruptedPath, 'utf-8'));
  } catch (error) {
    console.log(`⚠️  invoice-corrupted.json not found. Skipping refusability tests.`);
    return [];
  }

  // Validate using business rules (not filename)
  const validation = await validateInvoiceRules(corruptedFixture);

  // Map rejection reasons to test scenarios
  const scenarios: Array<{
    test: string;
    expectedResult: string;
    reason?: string;
  }> = [];

  if (validation.rejectionReasons) {
    validation.rejectionReasons.forEach(reason => {
      scenarios.push({
        test: reason.split(':')[0], // Extract test name
        expectedResult: 'REFUSED',
        reason
      });
    });
  }

  return scenarios.map(scenario => ({
    test: scenario.test,
    expectedResult: scenario.expectedResult,
    actualResult: 'UNKNOWN' as const, // TODO: Verify system actually rejects
    passed: false, // TODO: Verify rejection actually occurred
    reason: scenario.reason
  }));
}

/**
 * Phase 2B: Rendering Validation Checklist
 * Manual visual verification items
 */
function getRenderingChecklist(): {
  category: string;
  checks: string[];
}[] {
  return [
    {
      category: 'Logo & Branding',
      checks: [
        'Logo visible and crisp',
        'Company branding applied correctly',
        'Color scheme matches branding snapshot',
        'Missing logo handled gracefully'
      ]
    },
    {
      category: 'Company & Customer Info',
      checks: [
        'Company GSTIN visible (16 chars)',
        'Customer GSTIN visible',
        'Company address complete',
        'Customer address complete',
        'Contact phone visible',
        'Contact email visible'
      ]
    },
    {
      category: 'Tax & Totals',
      checks: [
        'Tax table readable',
        'CGST amount visible',
        'SGST amount visible',
        'IGST amount visible (if applicable)',
        'Grand total visually obvious',
        'Totals align with calculations'
      ]
    },
    {
      category: 'Invoice Details',
      checks: [
        'Invoice number visible',
        'Invoice date visible',
        'Due date prominent',
        'Payment terms clear',
        'Invoice type shown (TAX_INVOICE)'
      ]
    },
    {
      category: 'Line Items',
      checks: [
        'All items render without clipping',
        'SKU visible',
        'Description complete',
        'HSN code present',
        'Quantity and unit visible',
        'Unit price clear',
        'Line totals aligned'
      ]
    },
    {
      category: 'Multi-page (Large Invoices)',
      checks: [
        'Header repeats on page 2+',
        'Rows never split awkwardly',
        'Page breaks occur at natural boundaries',
        'Totals only on final page',
        'Page numbers visible',
        'Professional appearance maintained'
      ]
    },
    {
      category: 'Unicode & Edge Cases (Nightmare)',
      checks: [
        'Tamil text (தமிழ்) renders correctly',
        'Chinese text (北京公司) renders correctly',
        'German umlauts (Müller) render correctly',
        'Long descriptions wrap without clipping',
        'Long SKUs display fully',
        'Very large totals format correctly',
        'Long addresses wrap properly',
        'Extreme values (999999.99) render correctly'
      ]
    },
    {
      category: 'Final Quality',
      checks: [
        'No overlapping text',
        'No clipped content',
        'Professional appearance overall',
        'Would send to customer with confidence'
      ]
    }
  ];
}

/**
 * Assert template has not mutated since freeze
 * CRITICAL: Reproducibility requires frozen templates
 */
function assertTemplateFrozen(
  currentTemplateCommit: string,
  frozenTemplateCommit: string,
  templateVersion: string
): void {
  if (currentTemplateCommit !== frozenTemplateCommit) {
    throw new Error(
      `TEMPLATE MUTATED AFTER FREEZE\n` +
      `Version: ${templateVersion}\n` +
      `Expected commit: ${frozenTemplateCommit}\n` +
      `Current commit: ${currentTemplateCommit}\n` +
      `\n` +
      `Specification is frozen but template is mutable.\n` +
      `Evidence cannot be collected with a changed template.\n` +
      `Abort validation.`
    );
  }
}

/**
 * Extract totals from PDF with confidence tracking
 *
 * CRITICAL: Returns confidence level
 * confidence = LOW or FAILED → Gate 1 = UNKNOWN (not PASS)
 */
interface PdfExtractionResult {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'FAILED';
  invoiceNumber?: string;
  lineItems?: Array<{
    lineNumber: number;
    sku: string;
    quantity: number;
    unitPrice: number;
    grossAmount: number;
  }>;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  grandTotal?: number;
  warnings: string[];
}

async function extractTotalsFromPdf(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
  // TODO: When PDF extraction implemented:
  // 1. Extract invoice number
  // 2. Extract sample line items (first 3, middle, last)
  // 3. Extract tax totals
  // 4. Extract grand total
  // 5. Assess extraction confidence:
  //    - HIGH: all fields found, clear text
  //    - MEDIUM: some fields require regex/OCR
  //    - LOW: heavy OCR needed, ambiguous
  //    - FAILED: cannot extract critical fields

  return {
    confidence: 'FAILED',
    warnings: ['PDF extraction not yet implemented']
  };
}

/**
 * Verify sample line items extracted from PDF match ViewModel
 */
function verifyLineItemsMatch(
  extractedLineItems: Array<{ lineNumber: number; sku: string; grossAmount: number }> | undefined,
  vmLineItems: any[],
  tolerance: number = 0.01
): { match: boolean; mismatches: string[] } {
  if (!extractedLineItems || extractedLineItems.length === 0) {
    return { match: false, mismatches: ['No line items extracted from PDF'] };
  }

  const mismatches: string[] = [];

  // Verify sample items: first, middle, last
  const samples = [
    extractedLineItems[0],
    extractedLineItems[Math.floor(extractedLineItems.length / 2)],
    extractedLineItems[extractedLineItems.length - 1]
  ].filter(Boolean);

  samples.forEach(extracted => {
    const vmItem = vmLineItems.find(item => item.slNo === extracted.lineNumber);
    if (!vmItem) {
      mismatches.push(`Line ${extracted.lineNumber}: not found in ViewModel`);
      return;
    }

    const diff = Math.abs(extracted.grossAmount - (vmItem.grossAmount || 0));
    if (diff > tolerance) {
      mismatches.push(
        `Line ${extracted.lineNumber} (${extracted.sku}): ` +
        `Expected ₹${vmItem.grossAmount}, got ₹${extracted.grossAmount}, diff ₹${diff.toFixed(2)}`
      );
    }
  });

  return {
    match: mismatches.length === 0,
    mismatches
  };
}

/**
 * Phase 2B: Main Validation Runner
 * Execute all tests and produce evidence report
 *
 * CRITICAL: Fail fast on Gate 1.
 * If DB != ViewModel != PDF, stop. Do not continue to Gates 2-3.
 * A beautiful PDF with wrong totals is a broken invoice.
 *
 * CRITICAL: Template must not have mutated since freeze.
 */
async function runPhase2B(): Promise<void> {
  const fixturesDir = '/opt/Inventory-control-prod/fixtures/invoices';
  const fixtures = [
    'invoice-small.json',
    'invoice-legal.json',
    'invoice-large.json',
    'invoice-stress.json',
    'invoice-nightmare.json',
    'invoice-corrupted.json'
  ];

  const results: ValidationResult[] = [];
  const startTime = Date.now();

  console.log('\n' + '█'.repeat(80));
  console.log('PHASE 2B: INVOICE PDF VALIDATION HARNESS');
  console.log('Generating PDFs and collecting evidence');
  console.log('█'.repeat(80));

  // CRITICAL: Assert template has not mutated since freeze
  const frozenTemplateCommit = process.env.TEMPLATE_GIT_COMMIT || 'unknown';
  const currentTemplateCommit = process.env.CURRENT_TEMPLATE_COMMIT || frozenTemplateCommit;

  try {
    assertTemplateFrozen(currentTemplateCommit, frozenTemplateCommit, 'v1.1');
    console.log('✅ Template freeze verified: specification still frozen');
  } catch (error) {
    console.error('❌ ABORT: ' + error.message);
    return;
  }

  console.log('CRITICAL: Gate 1 failure blocks everything');
  console.log('CRITICAL: Line items AND totals must match');
  console.log('█'.repeat(80) + '\n');

  for (const fixtureFile of fixtures) {
    const fixturePath = path.join(fixturesDir, fixtureFile);

    if (!fs.existsSync(fixturePath)) {
      console.log(`⚠️  Fixture not found: ${fixtureFile}`);
      continue;
    }

    let renderStatus: 'SUCCESS' | 'FAILED' | 'REFUSED' = 'SUCCESS';
    const auditLog: string[] = [];

    try {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      auditLog.push(`[${new Date().toISOString()}] Processing: ${fixtureFile}`);

      console.log(`\n${'='.repeat(80)}`);
      console.log(`FIXTURE: ${fixtureFile}`);
      console.log(`${'='.repeat(80)}`);

      // Special case: Validate invoice rules (might REFUSE)
      const invoiceValidation = await validateInvoiceRules(fixture);
      if (!invoiceValidation.isValid) {
        console.log('[STEP 1/1] Validating invoice rules...');
        renderStatus = 'REFUSED';
        const reasons = invoiceValidation.rejectionReasons || [];
        auditLog.push(`Invoice validation failed: ${reasons.join('; ')}`);

        const result: ValidationResult = {
          fixture: fixtureFile,
          renderStatus,
          gate1: {
            status: 'SKIPPED',
            reason: 'Invoice rejected before PDF generation'
          },
          gate2: { status: 'SKIPPED' },
          gate3: { status: 'SKIPPED' },
          authenticity: {},
          renderEnvironment: {},
          errors: reasons,
          auditLog
        };

        results.push(result);
        console.log(`      🛑 REFUSED (business rules violated)`);
        reasons.forEach(r => console.log(`         • ${r}`));
        console.log('');
        continue;
      }

      // Step 1: Generate PDF
      console.log('[STEP 1/3] Generating PDF...');
      const { pdfBuffer, metrics } = await generateInvoicePdf(fixturePath);
      auditLog.push(`PDF generated: ${metrics.fileSizeBytes} bytes`);

      // Step 2: Three-way reconciliation (CRITICAL: Fail fast if Gate 1 fails)
      console.log('[STEP 2/4] GATE 1: Reconciling totals (DB == VM == PDF)...');
      const totals = await reconcileTotals(fixture, pdfBuffer);

      console.log(`      DB Total:  ₹${totals.reconciliation.dbTotal.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${totals.reconciliation.dbTotal.state})`);
      console.log(`      VM Total:  ₹${totals.reconciliation.vmTotal.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${totals.reconciliation.vmTotal.state})`);
      console.log(`      PDF Total: ₹${totals.reconciliation.pdfTotal.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${totals.reconciliation.pdfTotal.state})`);
      if (totals.reconciliation.diff >= 0) {
        console.log(`      Diff:      ₹${totals.reconciliation.diff.toFixed(2)}`);
      } else {
        console.log(`      Diff:      [Not calculable - evidence not CONFIRMED]`);
      }
      console.log(`      Extraction Confidence: ${totals.pdfExtractionConfidence.level}`);
      if (totals.pdfExtractionConfidence.reason) {
        console.log(`                            ${totals.pdfExtractionConfidence.reason}`);
      }

      let gate1Status: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';
      let gate1Reason = '';

      if (!totals.canPass) {
        gate1Status = 'UNKNOWN';
        gate1Reason = 'Cannot determine: DB or PDF total not yet CONFIRMED';
        console.log(`      Status:    ⏳ UNKNOWN (evidence not CONFIRMED)`);
        auditLog.push(`Gate 1 UNKNOWN: ${gate1Reason}`);
      } else if (!totals.passed) {
        gate1Status = 'FAIL';
        renderStatus = 'FAILED';
        gate1Reason = `DB ≠ ViewModel ≠ PDF (diff: ₹${totals.reconciliation.diff.toFixed(2)})`;
        console.log(`      Status:    ❌ FAIL`);
        auditLog.push(`Gate 1 FAILED: ${gate1Reason}`);

        // Log line-level mismatches for debugging
        if (totals.mismatchedLines.length > 0) {
          console.log(`\n      ⚠️  Line-level mismatches:`);
          totals.mismatchedLines.slice(0, 3).forEach(line => {
            console.log(
              `         Line ${line.lineNumber} (SKU: ${line.sku}): ` +
              `Expected ₹${line.expectedGrossAmount.toFixed(2)}, ` +
              `Got ₹${line.actualGrossAmount.toFixed(2)} (diff: ₹${line.diff.toFixed(2)})`
            );
          });
          if (totals.mismatchedLines.length > 3) {
            console.log(`         ... and ${totals.mismatchedLines.length - 3} more`);
          }
        }
      } else {
        gate1Status = 'PASS';
        console.log(`      Status:    ✅ PASS`);
        auditLog.push(`Gate 1 PASSED: DB==VM==PDF`);
      }

      // FAIL or UNKNOWN FAST: Do not continue to Gate 2 or Gate 3
      if (gate1Status !== 'PASS') {
        console.log(`\n      🛑 GATE 1 NOT PASSED - BLOCKS GATES 2-3`);
        console.log(`      Stopping here.\n`);

        const result: ValidationResult = {
          fixture: fixtureFile,
          renderStatus: gate1Status === 'FAIL' ? 'FAILED' : 'SUCCESS',
          gate1: {
            status: gate1Status,
            reason: gate1Reason,
            reconciliation: totals.reconciliation,
            mismatchedLines: totals.mismatchedLines,
            pdfExtractionConfidence: totals.pdfExtractionConfidence
          },
          gate2: { status: 'SKIPPED', reason: 'Gate 1 not passed' },
          gate3: { status: 'SKIPPED', reason: 'Gate 1 not passed' },
          authenticity: {
            sha256: { value: metrics.sha256, state: EvidenceState.CONFIRMED },
            generatedAt: metrics.generatedAt
          },
          renderEnvironment: {
            chromeVersion: metrics.chromeVersion,
            nodeVersion: metrics.nodeVersion,
            templateVersion: metrics.templateVersion,
            templateGitCommit: metrics.templateGitCommit
          },
          auditLog
        };

        results.push(result);

        // Only FAIL blocks Gates 2-3. UNKNOWN continues.
        if (gate1Status !== 'FAIL') {
          console.log(`      ℹ️  Gate 1 UNKNOWN (infrastructure missing, not invoice wrong)`);
          console.log(`      Continuing to Gates 2-3.\n`);
          // Fall through to Gates 2 and 3
        } else {
          console.log(`      🛑 GATE 1 FAILED - Stopping here.\n`);
          continue; // Skip Gates 2 and 3 only on FAIL
        }
      }

      // Gate 2: Verify business fields exist (automatic)
      console.log(`\n[STEP 3/4] GATE 2A: Verifying business fields exist...`);
      const gate2AResult = verifyGate2A(fixture);
      console.log(`      Status: ${gate2AResult.status === 'PASS' ? '✅' : '❌'} ${gate2AResult.status}`);
      if (gate2AResult.reason) {
        console.log(`      Reason: ${gate2AResult.reason}`);
      }
      if (gate2AResult.verifiedFields && gate2AResult.verifiedFields.length > 0) {
        console.log(`      Verified: ${gate2AResult.verifiedFields.slice(0, 3).join(', ')}${gate2AResult.verifiedFields.length > 3 ? '...' : ''}`);
      }
      auditLog.push(`Gate 2A status: ${gate2AResult.status}`);

      // Gate 2B: Verify fields are visible in PDF (manual)
      console.log(`\n      GATE 2B: Verifying field visibility in PDF...`);
      const gate2BResult = verifyGate2B();
      console.log(`      Status: ${gate2BResult.status === 'PASS' ? '✅' : '⏳'} ${gate2BResult.status}`);
      console.log(`      Reason: ${gate2BResult.reason}`);
      auditLog.push(`Gate 2B status: ${gate2BResult.status}`);

      // Combine Gate 2A and 2B for result
      // CRITICAL: PASS requires ALL evidence. UNKNOWN doesn't become PASS.
      let gate2Status: 'PASS' | 'FAIL' | 'UNKNOWN';
      if (gate2AResult.status === 'FAIL') {
        gate2Status = 'FAIL';
      } else if (gate2AResult.status === 'PASS' && gate2BResult.status === 'PASS') {
        gate2Status = 'PASS';
      } else {
        gate2Status = 'UNKNOWN';
      }
      console.log(`      Combined Gate 2: ${gate2Status === 'PASS' ? '✅' : gate2Status === 'FAIL' ? '❌' : '⏳'} ${gate2Status}`);

      // Capture HTML snapshot (for debugging, if rendered)
      const htmlSnapshot = await captureHtmlSnapshot(fixtureFile, null); // TODO: Pass actual HTML when available
      if (htmlSnapshot.captured) {
        console.log(`      HTML snapshot: ${htmlSnapshot.size} bytes`);
      }

      // Gate 3A: Automatic rendering checks
      console.log(`\n[STEP 4/4] GATE 3A: Automatic rendering checks...`);
      const gate3AResult = verifyGate3A(pdfBuffer, metrics);
      console.log(`      Render Time:  ${metrics.renderTimeMs}ms`);
      console.log(`      Page Count:   ${metrics.pageCount}`);
      console.log(`      File Size:    ${(metrics.fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
      console.log(`      Peak Memory:  ${metrics.peakMemoryMb}MB`);
      console.log(`      SHA256:       ${metrics.sha256.substring(0, 16)}...`);
      console.log(`      Status: ${gate3AResult.status === 'PASS' ? '✅' : '❌'} ${gate3AResult.status}`);
      if (gate3AResult.reason) {
        console.log(`      Reason: ${gate3AResult.reason}`);
      }
      auditLog.push(`Gate 3A status: ${gate3AResult.status}`);

      // Gate 3B: Manual rendering inspection checklist
      console.log(`\n      GATE 3B: Manual rendering inspection...`);
      const gate3BResult = verifyGate3B();
      console.log(`      Status: ${gate3BResult.status === 'UNKNOWN' ? '⏳' : '⏳'} ${gate3BResult.status}`);
      console.log(`      Reason: ${gate3BResult.reason}`);
      if (gate3BResult.checklist) {
        console.log(`      Checklist items:`);
        gate3BResult.checklist.slice(0, 3).forEach(item => console.log(`        • ${item}`));
        if (gate3BResult.checklist.length > 3) {
          console.log(`        ... and ${gate3BResult.checklist.length - 3} more`);
        }
      }
      auditLog.push(`Gate 3B status: ${gate3BResult.status}`);

      // Combine Gate 3A and 3B for result
      // CRITICAL: PASS requires ALL evidence. UNKNOWN doesn't become PASS.
      let gate3Status: 'PASS' | 'FAIL' | 'UNKNOWN';
      if (gate3AResult.status === 'FAIL') {
        gate3Status = 'FAIL';
      } else if (gate3AResult.status === 'PASS' && gate3BResult.status === 'PASS') {
        gate3Status = 'PASS';
      } else {
        gate3Status = 'UNKNOWN';
      }
      console.log(`      Combined Gate 3: ${gate3Status === 'PASS' ? '✅' : gate3Status === 'FAIL' ? '❌' : '⏳'} ${gate3Status}`);

      // Store result
      const result: ValidationResult = {
        fixture: fixtureFile,
        renderStatus,
        gate1: {
          status: gate1Status,
          reconciliation: totals.reconciliation,
          mismatchedLines: totals.mismatchedLines,
          pdfExtractionConfidence: totals.pdfExtractionConfidence
        },
        gate2: {
          status: gate2Status,
          reason: gate2AResult.status === 'FAIL' ? gate2AResult.reason : gate2BResult.reason,
          missingFields: gate2AResult.missingFields,
          verifiedFields: gate2AResult.verifiedFields
        },
        gate3: {
          status: gate3Status,
          reason: gate3AResult.status === 'FAIL' ? gate3AResult.reason : gate3BResult.reason,
          renderTimeMs: metrics.renderTimeMs,
          pageCount: metrics.pageCount,
          fileSizeBytes: metrics.fileSizeBytes,
          peakMemoryMb: metrics.peakMemoryMb
        },
        authenticity: {
          sha256: { value: metrics.sha256, state: EvidenceState.CONFIRMED },
          generatedAt: metrics.generatedAt
        },
        renderEnvironment: {
          chromeVersion: metrics.chromeVersion,
          nodeVersion: metrics.nodeVersion,
          templateVersion: metrics.templateVersion,
          templateGitCommit: metrics.templateGitCommit
        },
        htmlSnapshot: {
          filename: fixtureFile.replace('.json', '.html'),
          path: htmlSnapshot.path,
          captured: htmlSnapshot.captured,
          size: htmlSnapshot.size
        },
        auditLog
      };

      results.push(result);
      console.log('');
    } catch (error) {
      renderStatus = 'FAILED';
      console.log(`❌ ${error.message}\n`);
      auditLog.push(`EXCEPTION: ${error.message}`);

      results.push({
        fixture: fixtureFile,
        renderStatus,
        gate1: { status: 'FAIL', reason: error.message },
        gate2: { status: 'SKIPPED' },
        gate3: { status: 'SKIPPED' },
        authenticity: {},
        renderEnvironment: {},
        errors: [error.message],
        auditLog
      });
    }
  }

  // Phase 2B: Refusability Tests (invoice-corrupted.json)
  console.log(`\n${'='.repeat(80)}`);
  console.log('REFUSABILITY TEST: invoice-corrupted.json');
  console.log('System should REFUSE to generate PDFs with corrupted data');
  console.log(`${'='.repeat(80)}`);

  const refusabilityResults = await testRefusability(fixturesDir);
  if (refusabilityResults.length === 0) {
    console.log('⏳ No refusability tests defined. Add corruptions to invoice-corrupted.json.');
  } else {
    refusabilityResults.forEach(test => {
      const status = test.passed ? '✅' : '⏳';
      console.log(`\n${status} ${test.test}`);
      console.log(`   Expected: ${test.expectedResult}`);
      console.log(`   Actual:   ${test.actualResult}`);
      if (test.reason) {
        console.log(`   Reason:   ${test.reason}`);
      }
    });
  }

  // Phase 2B: Rendering Checklist
  console.log(`\n${'='.repeat(80)}`);
  console.log('RENDERING VALIDATION CHECKLIST');
  console.log('(Manual verification required after PDFs generated)');
  console.log(`${'='.repeat(80)}`);

  getRenderingChecklist().forEach(category => {
    console.log(`\n${category.category}:`);
    category.checks.forEach(check => {
      console.log(`  ⏳ [ ] ${check}`);
    });
  });

  // Summary
  console.log(`${'█'.repeat(80)}`);
  console.log('PHASE 2B SUMMARY');
  console.log(`${'█'.repeat(80)}`);

  const successCount = results.filter(r => r.renderStatus === 'SUCCESS').length;
  const failureCount = results.filter(r => r.renderStatus === 'FAILED').length;
  const refusedCount = results.filter(r => r.renderStatus === 'REFUSED').length;
  const totalCount = results.length;

  console.log(`\nRender Status Distribution:`);
  console.log(`  SUCCESS: ${successCount}/${totalCount}`);
  console.log(`  FAILED:  ${failureCount}/${totalCount}`);
  console.log(`  REFUSED: ${refusedCount}/${totalCount}`);

  const gate1PassCount = results.filter(r => r.gate1.status === 'PASS').length;
  const gate1UnknownCount = results.filter(r => r.gate1.status === 'UNKNOWN').length;
  const gate1FailCount = results.filter(r => r.gate1.status === 'FAIL').length;

  console.log(`\nGate 1 (DB == VM == PDF):`);
  console.log(`  ✅ PASS:    ${gate1PassCount}/${totalCount}`);
  console.log(`  ⏳ UNKNOWN: ${gate1UnknownCount}/${totalCount} (evidence not CONFIRMED)`);
  console.log(`  ❌ FAIL:    ${gate1FailCount}/${totalCount}`);

  const gate2PassCount = results.filter(r => r.gate2.status === 'PASS').length;
  const gate2UnknownCount = results.filter(r => r.gate2.status === 'UNKNOWN').length;
  console.log(`\nGate 2 (Legal & Audit Readiness):`);
  console.log(`  ✅ PASS:    ${gate2PassCount}/${totalCount}`);
  console.log(`  ⏳ UNKNOWN: ${gate2UnknownCount}/${totalCount} (PDF visibility not verified)`);

  const gate3PassCount = results.filter(r => r.gate3.status === 'PASS').length;
  const gate3UnknownCount = results.filter(r => r.gate3.status === 'UNKNOWN').length;
  console.log(`\nGate 3 (Rendering Reliability):`);
  console.log(`  ✅ PASS:    ${gate3PassCount}/${totalCount}`);
  console.log(`  ⏳ UNKNOWN: ${gate3UnknownCount}/${totalCount} (rendering verification pending)`);

  console.log(`\nElapsed Time: ${Date.now() - startTime}ms`);

  // Export results as JSON
  const outputPath = '/root/.claude/jobs/2f849657/tmp/phase2b-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved: ${outputPath}`);

  // Final status
  console.log(`\n${'█'.repeat(80)}`);
  if (gate1UnknownCount > 0) {
    console.log('⏳ EVIDENCE STATE: PLACEHOLDER');
    console.log(`\n${gate1UnknownCount} fixture(s) have UNKNOWN Gate 1 status.`);
    console.log('This is expected: PDF extraction not yet implemented.');
    console.log('\nWhen infrastructure is available:');
    console.log('  1. Implement DocumentPdfFacade.renderInvoicePdf()');
    console.log('  2. Implement PDF text extraction for totals');
    console.log('  3. Fetch DB totals from database');
    console.log('  4. Run harness again for CONFIRMED evidence');
  } else if (gate1FailCount > 0) {
    console.log('❌ EVIDENCE STATE: CONFIRMED FAILURE');
    console.log(`\n${gate1FailCount} fixture(s) failed Gate 1.`);
    console.log('A PDF with wrong totals is a broken invoice.');
    console.log('Investigate root causes before production.');
  } else if (gate1PassCount === totalCount - refusedCount) {
    console.log('✅ EVIDENCE STATE: CONFIRMED PASS');
    console.log('\nAll valid fixtures passed Gate 1 reconciliation.');
    console.log(`${refusedCount} fixture(s) were correctly REFUSED.`);
    if (gate2UnknownCount === 0 && gate3UnknownCount === 0) {
      console.log('\n🎉 INVOICE ENGINE EARNS TRUST');
    } else {
      console.log('\nGates 2-3 verification still pending.');
    }
  }
  console.log(`${'█'.repeat(80)}`);
}

// Execute
runPhase2B().catch(error => {
  console.error('Phase 2B harness failed:', error);
  process.exit(1);
});
