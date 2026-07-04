import { PlatformHealthService } from './platform-health.service';

function buildService(threshold = 3, resetMs = 1000) {
  const config = {
    get: (key: string) => {
      if (key === 'CIRCUIT_BREAKER_THRESHOLD') return threshold;
      if (key === 'CIRCUIT_BREAKER_RESET_MS') return resetMs;
      return undefined;
    },
  };
  return new PlatformHealthService(config as never);
}

describe('PlatformHealthService', () => {
  it('is closed initially', () => {
    const svc = buildService();
    expect(svc.isOpen('ai_provider')).toBe(false);
    expect(svc.status().ai_provider.open).toBe(false);
  });

  it('opens after reaching the failure threshold', () => {
    const svc = buildService(3);
    svc.recordFailure('ai_provider');
    svc.recordFailure('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(false);
    svc.recordFailure('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(true);
    expect(svc.status().ai_provider.consecutiveFailures).toBe(3);
  });

  it('closes immediately after a success (before threshold)', () => {
    const svc = buildService(3);
    svc.recordFailure('ai_provider');
    svc.recordSuccess('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(false);
    expect(svc.status().ai_provider.consecutiveFailures).toBe(0);
  });

  it('closes after a success when open', () => {
    const svc = buildService(2);
    svc.recordFailure('ai_provider');
    svc.recordFailure('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(true);
    svc.recordSuccess('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(false);
  });

  it('transitions to half-open after the reset timeout and allows a probe', async () => {
    const svc = buildService(2, 50); // 50ms reset
    svc.recordFailure('ai_provider');
    svc.recordFailure('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(true);

    await new Promise((r) => setTimeout(r, 60));

    // Should be half-open (allows probe through)
    expect(svc.isOpen('ai_provider')).toBe(false);
  });

  it('tracks failures and successes independently per dependency', () => {
    const svc = buildService(2);
    svc.recordFailure('ai_provider');
    svc.recordFailure('ai_provider');
    expect(svc.isOpen('ai_provider')).toBe(true);
    expect(svc.isOpen('whatsapp_api')).toBe(false);
    expect(svc.isOpen('database')).toBe(false);
  });

  it('status() returns counters for all three dependencies', () => {
    const svc = buildService(5);
    svc.recordFailure('whatsapp_api');
    svc.recordSuccess('database');
    const s = svc.status();
    expect(s.whatsapp_api.totalFailures).toBe(1);
    expect(s.database.totalSuccesses).toBe(1);
    expect(s.ai_provider.totalFailures).toBe(0);
  });
});
