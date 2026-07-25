import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RequestContextStore } from '../common/context/request-context';
import { TenantContext } from '../common/tenant/tenant-context';

/**
 * Models that maintain a `deletedAt` timestamp instead of being hard-deleted.
 * Reads on these models are auto-filtered to `deletedAt: null` via the Prisma
 * client extension installed below. Callers can opt out by passing an explicit
 * `where: { deletedAt: ... }` clause.
 */
const SOFT_DELETE_MODELS = new Set<Prisma.ModelName>(['User', 'Supplier']);

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

type SoftDeleteModelLower = 'user' | 'supplier';

function applyDeletedAtFilter(rawArgs: unknown): Record<string, unknown> {
  const args = (rawArgs ?? {}) as Record<string, unknown>;
  const existingWhere = (args.where ?? {}) as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(existingWhere, 'deletedAt')) {
    return args;
  }
  return { ...args, where: { ...existingWhere, deletedAt: null } };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    const slowMs = Number(process.env.SLOW_QUERY_MS ?? '200');
    // Tap query events at warn level when they exceed the slow-query budget.
    // Params are intentionally omitted to keep PII out of structured logs.
    (
      this as unknown as { $on: (event: 'query', cb: (e: Prisma.QueryEvent) => void) => void }
    ).$on('query', (event) => {
      if (event.duration >= slowMs) {
        const ctx = RequestContextStore.get();
        const requestId = ctx?.requestId ?? null;
        this.logger.warn(
          `[slow-query] ${event.duration}ms ${requestId ? `req=${requestId} ` : ''}${event.query.replace(/\s+/g, ' ').slice(0, 240)}`,
        );
      }
    });

    // Build a soft-delete-aware extended client and proxy delegate access on
    // `this` to it so existing `prisma.user.findMany(...)` calls transparently
    // pick up the filter. We keep `$transaction`, `$queryRaw`, `$executeRaw`,
    // `$on`, `$connect`, `$disconnect` on the underlying client because the
    // extended client preserves those methods unchanged.
    // Capture a reference to the base client for use inside the extension.
    // The extension itself cannot call this.$transaction — it needs the base client.
    const base = this as unknown as PrismaClient;

    const extended = base.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Apply soft-delete filter first.
            let resolvedArgs = args;
            if (model && SOFT_DELETE_MODELS.has(model as Prisma.ModelName) && READ_OPS.has(operation)) {
              resolvedArgs = applyDeletedAtFilter(args) as typeof args;
            }

            const ctx = TenantContext.get();
            // Skip RLS wrap when: no company context, or already inside the
            // wrapping transaction (prevents infinite recursion).
            if (!ctx?.companyId || ctx.inRLSTx) {
              return query(resolvedArgs);
            }

            const companyId = ctx.companyId;
            // Use SET LOCAL so the setting is scoped to this transaction only,
            // which is safe with connection pooling — it resets on commit/rollback.
            return base.$transaction(async () => {
              await base.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
              return TenantContext.run({ companyId, inRLSTx: true }, () => query(resolvedArgs));
            });
          },
        },
      },
    });

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        // Methods/state defined directly on PrismaService take precedence.
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        // Everything else (model delegates, $transaction, etc.) goes through
        // the extended client so soft-delete filters apply.
        const value = Reflect.get(extended as object, prop);
        if (typeof value === 'function') {
          return (value as (...a: unknown[]) => unknown).bind(extended);
        }
        return value;
      },
    });
  }

  /**
   * Soft-delete a row by writing `deletedAt = now()`. Type-safe over the
   * SOFT_DELETE_MODELS set.
   */
  async softDelete(model: SoftDeleteModelLower, where: { id: string }): Promise<void> {
    const delegate = (this as unknown as Record<string, unknown>)[model] as {
      update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<unknown>;
    };
    await delegate.update({ where, data: { deletedAt: new Date() } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
