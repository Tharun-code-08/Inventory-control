import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { buildPoPdfDataFromRecord } from '../../common/pdf/build-po-pdf-data';
import {
  purchaseOrderPdfFilename,
  renderPurchaseOrderPdfBuffer,
} from '../../common/pdf/purchase-order-pdf';
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
        include: { items: { include: { product: true } }, shop: { select: { shopName: true, companyId: true } } },
      });
      if (!po) {
        throw new Error('Purchase order not found');
      }
      if (!po.shop.companyId) {
        throw new Error('Shop not linked to a company');
      }
      const fileName = purchaseOrderPdfFilename(po.poNumber);
      const outPath = path.join(dir, fileName);
      const pdfBuffer = await renderPurchaseOrderPdfBuffer(
        await buildPoPdfDataFromRecord(this.prisma, po, po.shop.companyId),
      );
      await fs.writeFile(outPath, pdfBuffer);
      return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
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
