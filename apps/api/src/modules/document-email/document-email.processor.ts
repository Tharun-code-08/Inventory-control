import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DOCUMENT_EMAIL_QUEUE } from './document-email.constants';
import { DocumentEmailService } from './document-email.service';

type OutboxJobData = { outboxId: string };

@Processor(DOCUMENT_EMAIL_QUEUE)
export class DocumentEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentEmailProcessor.name);

  constructor(private readonly documentEmail: DocumentEmailService) {
    super();
  }

  async process(job: Job<OutboxJobData>) {
    const { outboxId } = job.data;
    try {
      await this.documentEmail.processOutbox(outboxId);
      return { ok: true, outboxId };
    } catch (err) {
      const message = (err as Error).message ?? 'Retry failed';
      await this.documentEmail.scheduleBackgroundRetry(outboxId, message);
      this.logger.warn(`Document email retry failed for ${outboxId}: ${message}`);
      return { ok: false, outboxId, error: message };
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<OutboxJobData> | undefined, err: Error) {
    this.logger.error(`Document email job ${job?.id ?? '?'} failed: ${err.message}`);
  }
}
