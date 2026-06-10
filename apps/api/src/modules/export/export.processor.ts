import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
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
    private readonly documentPdf: DocumentPdfService,
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
      const pdfResult = await this.documentPdf.renderPurchaseOrderPdfById(job.data.purchaseOrderId);
      const outPath = path.join(dir, pdfResult.filename);
      await fs.writeFile(outPath, pdfResult.buffer);
      return { downloadUrl: `/api/v1/export/files/${pdfResult.filename}`, fileName: pdfResult.filename };
    }

    if (job.data.type === 'report-xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(job.data.reportType);
      sheet.views = [{ state: 'frozen', ySplit: 2 }];
      sheet.addRow(['SoftdigitIMS']);
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
