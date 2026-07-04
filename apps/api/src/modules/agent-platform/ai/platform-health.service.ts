import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CircuitDependency = 'ai_provider' | 'whatsapp_api' | 'database';

type CircuitState = {
  consecutiveFailures: number;
  openedAt: number | null;
  totalFailures: number;
  totalSuccesses: number;
};

/**
 * Lightweight in-memory circuit breaker per dependency.
 *
 * Transition rules:
 *   CLOSED → OPEN  when consecutiveFailures >= threshold (default 5)
 *   OPEN   → HALF  after resetTimeoutMs (default 30s)
 *   HALF   → CLOSED on the next success; OPEN again on the next failure
 *
 * ⚠ INSTANCE-LOCAL: state lives in the Node.js heap of this process and
 * resets on restart. In a multi-instance deployment (k8s, autoscaling, PM2
 * cluster mode) each replica has its own counter — there is no cluster-wide
 * open/close. That is intentional for this MVP: adding Redis-backed shared
 * state and distributed consensus would outweigh the benefit at current scale.
 * Revisit when running > 1 concurrent replica or when observability shows
 * per-instance circuit gaps causing user-visible inconsistencies.
 */
@Injectable()
export class PlatformHealthService {
  private readonly logger = new Logger(PlatformHealthService.name);
  private readonly circuits = new Map<CircuitDependency, CircuitState>();

  constructor(private readonly config: ConfigService) {}

  /** Record a successful call — resets consecutive failure counter. */
  recordSuccess(dep: CircuitDependency): void {
    const s = this.getOrCreate(dep);
    const wasOpen = this.isOpen(dep);
    s.consecutiveFailures = 0;
    s.openedAt = null;
    s.totalSuccesses++;
    if (wasOpen) {
      this.logger.log(`Circuit ${dep} closed after recovery`);
    }
  }

  /** Record a failure — may open the circuit. */
  recordFailure(dep: CircuitDependency): void {
    const s = this.getOrCreate(dep);
    s.consecutiveFailures++;
    s.totalFailures++;
    if (!s.openedAt && s.consecutiveFailures >= this.threshold()) {
      s.openedAt = Date.now();
      this.logger.warn(
        `Circuit ${dep} OPEN after ${s.consecutiveFailures} consecutive failures (total failures: ${s.totalFailures})`,
      );
    }
  }

  /**
   * Returns true when the circuit is open (dependency should be skipped).
   * Transitions OPEN → HALF-OPEN transparently after the reset timeout so the
   * next real call acts as the probe (circuit closes on success, re-opens on
   * failure).
   */
  isOpen(dep: CircuitDependency): boolean {
    const s = this.getOrCreate(dep);
    if (!s.openedAt) return false;
    const elapsed = Date.now() - s.openedAt;
    if (elapsed >= this.resetTimeoutMs()) {
      // Half-open: allow one probe through. The actual success/failure callback
      // will close or reopen the circuit.
      this.logger.log(`Circuit ${dep} HALF-OPEN (elapsed ${Math.round(elapsed / 1000)}s) — allowing probe`);
      return false;
    }
    return true;
  }

  /** Current observable state for health dashboards / admin endpoints. */
  status(): Record<CircuitDependency, { open: boolean; consecutiveFailures: number; totalFailures: number; totalSuccesses: number }> {
    const deps: CircuitDependency[] = ['ai_provider', 'whatsapp_api', 'database'];
    return Object.fromEntries(
      deps.map((dep) => {
        const s = this.getOrCreate(dep);
        return [dep, {
          open: this.isOpen(dep),
          consecutiveFailures: s.consecutiveFailures,
          totalFailures: s.totalFailures,
          totalSuccesses: s.totalSuccesses,
        }];
      }),
    ) as Record<CircuitDependency, ReturnType<PlatformHealthService['status']>[CircuitDependency]>;
  }

  private getOrCreate(dep: CircuitDependency): CircuitState {
    let s = this.circuits.get(dep);
    if (!s) {
      s = { consecutiveFailures: 0, openedAt: null, totalFailures: 0, totalSuccesses: 0 };
      this.circuits.set(dep, s);
    }
    return s;
  }

  private threshold(): number {
    return Number(this.config.get('CIRCUIT_BREAKER_THRESHOLD') ?? 5);
  }

  private resetTimeoutMs(): number {
    return Number(this.config.get('CIRCUIT_BREAKER_RESET_MS') ?? 30_000);
  }
}
