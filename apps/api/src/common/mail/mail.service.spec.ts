import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

/**
 * Covers the MAIL_TRANSPORT=json sink used by CI/e2e: the service must report
 * itself configured and "deliver" mail without any network I/O, so flows that
 * hard-require delivery (RFQ send) can run against a disposable database.
 */
function buildService(env: Record<string, string>): MailService {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new MailService(config);
}

// Keys the service falls back to via process.env; isolate the tests from the shell.
const ENV_KEYS = ['MAIL_TRANSPORT', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
let savedEnv: Record<string, string | undefined>;

beforeAll(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('MailService (json transport sink)', () => {
  it('is not configured without SMTP_HOST or MAIL_TRANSPORT=json', () => {
    expect(buildService({}).isConfigured()).toBe(false);
  });

  it('is configured with SMTP_HOST alone', () => {
    expect(buildService({ SMTP_HOST: 'smtp.example.com' }).isConfigured()).toBe(true);
  });

  it('is configured with MAIL_TRANSPORT=json and no SMTP settings', () => {
    expect(buildService({ MAIL_TRANSPORT: 'json' }).isConfigured()).toBe(true);
  });

  it('sends RFQ invites through the sink without network I/O', async () => {
    const service = buildService({ MAIL_TRANSPORT: 'json' });
    const summary = await service.sendRfqInvites({
      rfqId: 'rfq-1',
      rfqNumber: 'RFQ-0001',
      rfqTitle: 'Test RFQ',
      deadline: null,
      recipients: [
        { supplierId: 's1', supplierName: 'Supplier One', email: 'one@example.com' },
        { supplierId: 's2', supplierName: 'Supplier Two', email: 'two@example.com' },
      ],
    });

    expect(summary.configured).toBe(true);
    expect(summary.sent).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.results.every((r) => r.status === 'sent')).toBe(true);
  });

  it('skips recipients without an email address', async () => {
    const service = buildService({ MAIL_TRANSPORT: 'json' });
    const summary = await service.sendRfqInvites({
      rfqId: 'rfq-2',
      rfqNumber: 'RFQ-0002',
      rfqTitle: 'Test RFQ',
      deadline: null,
      recipients: [
        { supplierId: 's1', supplierName: 'No Email', email: '' },
        { supplierId: 's2', supplierName: 'Has Email', email: 'ok@example.com' },
      ],
    });

    expect(summary.sent).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
  });

  it('reports skipped delivery when nothing is configured', async () => {
    const service = buildService({});
    const summary = await service.sendRfqInvites({
      rfqId: 'rfq-3',
      rfqNumber: 'RFQ-0003',
      rfqTitle: 'Test RFQ',
      deadline: null,
      recipients: [{ supplierId: 's1', supplierName: 'Supplier', email: 'x@example.com' }],
    });

    expect(summary.configured).toBe(false);
    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
  });
});
