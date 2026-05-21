import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exposes the four custom histograms in /metrics output', async () => {
    const svc = new MetricsService();
    svc.httpRequestDuration.labels('/x', 'GET', '200').observe(0.123);
    svc.bullJobDuration.labels('exports', 'report-xlsx', 'completed').observe(1.5);
    svc.prismaQueryDuration.labels('User', 'findMany').observe(0.01);
    svc.httpErrors.labels('/x', 'GET', '500').inc();

    const text = await svc.registry.metrics();
    expect(text).toMatch(/http_request_duration_seconds_bucket/);
    expect(text).toMatch(/bullmq_job_duration_seconds_bucket/);
    expect(text).toMatch(/prisma_query_duration_seconds_bucket/);
    expect(text).toMatch(/http_errors_total\{[^}]*\} 1/);
  });

  it('uses an isolated registry (does not pollute prom-client globalRegistry)', () => {
    const a = new MetricsService();
    const b = new MetricsService();
    expect(a.registry).not.toBe(b.registry);
  });
});
