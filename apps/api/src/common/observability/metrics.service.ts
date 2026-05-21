import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

/**
 * Single Prometheus registry for the API. We avoid using the default global
 * registry so unit tests can spin up isolated services without polluting the
 * process-wide metric set.
 */
@Injectable()
export class MetricsService {
  readonly registry: Registry = new Registry();

  readonly httpRequestDuration: Histogram<string>;
  readonly bullJobDuration: Histogram<string>;
  readonly prismaQueryDuration: Histogram<string>;
  readonly httpErrors: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['route', 'method', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.bullJobDuration = new Histogram({
      name: 'bullmq_job_duration_seconds',
      help: 'BullMQ job execution latency in seconds',
      labelNames: ['queue', 'name', 'status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.prismaQueryDuration = new Histogram({
      name: 'prisma_query_duration_seconds',
      help: 'Prisma query latency in seconds',
      labelNames: ['model', 'action'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpErrors = new Counter({
      name: 'http_errors_total',
      help: 'Total count of HTTP error responses (status >= 500)',
      labelNames: ['route', 'method', 'status'],
      registers: [this.registry],
    });
  }
}
