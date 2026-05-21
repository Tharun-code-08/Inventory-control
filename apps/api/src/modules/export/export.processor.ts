import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as Handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import { JobFailureService } from '../../common/queues/job-failure.service';
import { MetricsService } from '../../common/observability/metrics.service';

type ExportJob =
  | { type: 'po-pdf'; purchaseOrderId: string }
  | { type: 'report-xlsx'; reportType: string; filters: Record<string, unknown> };

@Processor('exports')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly failures: JobFailureService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ExportJob>) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('exports', String(job.name), 'completed')
      .observe(Math.max(0, durationSec));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ExportJob>, err: Error) {
    const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
    this.metrics.bullJobDuration
      .labels('exports', String(job.name), 'failed')
      .observe(Math.max(0, durationSec));
    await this.failures.record(job, err);
  }

  async process(job: Job<ExportJob>): Promise<{ downloadUrl: string; fileName: string }> {
    const dir = this.config.get<string>('EXPORT_STORAGE_DIR', './storage/exports');
    await fs.mkdir(dir, { recursive: true });

    if (job.data.type === 'po-pdf') {
      const po = await this.prisma.purchaseOrderHeader.findUnique({
        where: { id: job.data.purchaseOrderId },
        include: { items: { include: { product: true } }, shop: true },
      });
      if (!po) {
        throw new Error('Purchase order not found');
      }
      const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
        <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
        </head><body>
        <h2>Purchase Order {{no}}</h2>
        <p>Date: {{d}} | Shop: {{shop}} | Supplier: {{supplier}}</p>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
        {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
        </tbody></table>
        </body></html>`);
      const html = tpl({
        no: po.poNumber,
        d: po.poDate.toISOString().slice(0, 10),
        shop: po.shop.shopName,
        supplier: po.supplier,
        lines: po.items.map((i) => ({
          code: i.product.productCode,
          qty: i.orderQty.toString(),
          rate: i.rate.toString(),
          value: i.lineValue.toString(),
        })),
      });

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const fileName = `po-${job.data.purchaseOrderId}.pdf`;
        const outPath = path.join(dir, fileName);
        await page.pdf({ path: outPath, format: 'A4' });
        return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
      } finally {
        await browser.close();
      }
    }

    if (job.data.type === 'report-xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(job.data.reportType);
      sheet.views = [{ state: 'frozen', ySplit: 2 }];
      sheet.addRow(['Retail IMS']);
      sheet.addRow([`Report: ${job.data.reportType}`]);
      sheet.addRow(['Generated', new Date().toISOString()]);
      sheet.addRow([]);
      const header = sheet.addRow(['Column A', 'Column B']);
      header.font = { bold: true };
      header.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      sheet.addRow(['Example', '123']);
      const fileName = `report-${job.data.reportType}-${job.id}.xlsx`;
      const outPath = path.join(dir, fileName);
      await workbook.xlsx.writeFile(outPath);
      return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
    }

    this.logger.warn(`Unknown job type: ${JSON.stringify(job.data)}`);
    throw new Error('Unknown export job');
  }
}
