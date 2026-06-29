import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, QueueEvents, Worker } from 'bullmq';
import * as crypto from 'crypto';
import { QueueConfig } from './queue.config';
import { QueueName, QUEUE_CONFIG, JobPayload, getQueueForDocumentType } from './job-types';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<QueueName, Queue> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private workers: Map<QueueName, Worker> = new Map();

  constructor(private readonly config: QueueConfig) {}

  async onModuleInit() {
    await this.initializeQueues();
    this.logger.log('✓ BullMQ queues initialized');
  }

  async onModuleDestroy() {
    await this.closeQueues();
    this.logger.log('✓ BullMQ queues closed');
  }

  private async initializeQueues() {
    for (const queueName of Object.values(QueueName)) {
      const queueConfig = this.config.getQueueConfig(queueName);
      const queue = new Queue(queueName, {
        connection: queueConfig.connection,
      });
      this.queues.set(queueName as QueueName, queue);

      // Setup QueueEvents for proper event listening
      const queueEvents = new QueueEvents(queueName, {
        connection: queueConfig.connection,
      });
      this.queueEvents.set(queueName as QueueName, queueEvents);

      // Attach event listeners
      queueEvents.on('error', (error: Error) => {
        this.logger.error(`Queue ${queueName} error:`, error);
      });

      queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        this.logger.warn(`Job ${jobId} failed: ${failedReason}`);
      });

      queueEvents.on('completed', ({ jobId }: { jobId: string }) => {
        this.logger.log(`Job ${jobId} completed`);
      });

      queueEvents.on('progress', ({ jobId, data }: { jobId: string; data: number }) => {
        this.logger.debug(`Job ${jobId} progress: ${data}%`);
      });
    }
  }

  private async closeQueues() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const queueEvent of this.queueEvents.values()) {
      await queueEvent.close();
    }
    for (const worker of this.workers.values()) {
      await worker.close();
    }
  }

  private generateDeterministicJobId(payload: JobPayload): string {
    const hash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: payload.tenantId,
          documentType: payload.documentType,
          referenceId: payload.referenceId || null,
          templateVersion: '1.0',
          metadata: payload.metadata || {},
        }),
      )
      .digest('hex');

    return `${payload.documentType}-${hash.substring(0, 12)}`;
  }

  async queueJob(payload: JobPayload, forceRegenerate = false): Promise<string> {
    const queueName = getQueueForDocumentType(payload.documentType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobConfig = QUEUE_CONFIG[queueName];
    const jobId = this.generateDeterministicJobId(payload);

    // Check if job already exists (unless forced to regenerate)
    if (!forceRegenerate) {
      const existingJob = await queue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        this.logger.log(`Job already exists: ${jobId} (state: ${state})`);
        return jobId;
      }
    }

    const job = await queue.add(
      payload.documentType,
      payload,
      {
        attempts: jobConfig.attempts,
        backoff: jobConfig.backoff,
        removeOnComplete: jobConfig.removeOnComplete,
        removeOnFail: jobConfig.removeOnFail,
        jobId,
      },
    );

    this.logger.log(`Job queued: ${job.id} (${payload.documentType})`);
    return job.id || jobId;
  }

  async getJobStatus(jobId: string): Promise<any> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        let progress = 0;
        try {
          const p = (job as any).progress;
          progress = typeof p === 'function' ? p() : typeof p === 'number' ? p : 0;
        } catch {
          progress = 0;
        }

        return {
          id: job.id,
          status: await job.getState(),
          progress,
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          attempts: job.opts.attempts,
        };
      }
    }
    return null;
  }

  async getQueueMetrics(queueName: QueueName): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const counts = await queue.getJobCounts();
    return {
      queueName,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      waiting: counts.waiting,
      paused: counts.paused,
      timestamp: new Date(),
    };
  }

  async getAllMetrics(): Promise<any[]> {
    const metrics = [];
    for (const queueName of Object.values(QueueName)) {
      metrics.push(await this.getQueueMetrics(queueName as QueueName));
    }
    return metrics;
  }

  getQueue(queueName: QueueName): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }
    return queue;
  }

  getAllQueues(): Map<QueueName, Queue> {
    return this.queues;
  }
}
