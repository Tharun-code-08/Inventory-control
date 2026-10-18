import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RequestContextStore } from '../common/context/request-context';
import { TenantContext } from '../common/tenant/tenant-context';

/**
 * Models that maintain a `deletedAt` timestamp instead of being hard-deleted.
 * Reads are NOT auto-filtered: callers filter `deletedAt: null` explicitly
 * (supplier duplicate detection and code numbering need to see archived rows).
 */
type SoftDeleteModelLower = 'user' | 'supplier';

/** Own members of PrismaService (and its instance state) that must not be routed to the extended client. */
const SERVICE_MEMBERS = new Set<PropertyKey>(['logger', 'softDelete', 'onModuleInit', 'onModuleDestroy']);

/** Scope `app.current_company_id` (read by the RLS policies) to the current transaction. */
function setTenantConfig(client: Pick<PrismaClient, '$executeRaw'>, companyId: string) {
  return client.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
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

    // Build a tenant-aware extended client and proxy model access on `this` to
    // it so existing `prisma.shop.findMany(...)` calls run with the RLS company
    // context. The extension itself uses the base client to avoid recursion.
    const base = this as unknown as PrismaClient;

    const extended = base.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const ctx = TenantContext.get();
            // Skip RLS wrap when: no company context, or already inside the
            // wrapping transaction (prevents infinite recursion).
            if (!ctx?.companyId || ctx.inRLSTx) {
              return query(args);
            }

            // Standalone query: send set_config and the query as one batch
            // transaction so both run on the same connection. set_config(..., true)
            // is transaction-local, which is safe with connection pooling.
            const [, result] = await base.$transaction([
              setTenantConfig(base, ctx.companyId),
              query(args),
            ]);
            return result;
          },
        },
      },
    });

    // Interactive and batch transactions set the tenant on their own connection
    // up front and mark the context so the per-query wrapper above does not open
    // a second transaction (and a second pooled connection) for each query.
    const extendedTransaction = (extended.$transaction as (...a: unknown[]) => Promise<unknown>).bind(
      extended,
    );
    const tenantTransaction = (arg: unknown, options?: unknown): Promise<unknown> => {
      const ctx = TenantContext.get();
      if (!ctx?.companyId || ctx.inRLSTx) {
        return extendedTransaction(arg, options);
      }
      const inner = { companyId: ctx.companyId, inRLSTx: true };
      if (typeof arg === 'function') {
        return extendedTransaction(async (tx: PrismaClient) => {
          await setTenantConfig(tx, inner.companyId);
          return TenantContext.run(inner, () => (arg as (t: PrismaClient) => unknown)(tx));
        }, options);
      }
      return TenantContext.run(inner, () =>
        extendedTransaction([setTenantConfig(base, inner.companyId), ...(arg as unknown[])], options),
      ).then((results) => (results as unknown[]).slice(1));
    };

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === '$transaction') {
          return tenantTransaction;
        }
        // PrismaService's own members, and anything the extended client lacks
        // (e.g. `$on`), come from the base instance. Model delegates must NOT:
        // PrismaClient defines them on the instance too, so a plain
        // `Reflect.has(target, prop)` check would silently bypass the extension.
        if (SERVICE_MEMBERS.has(prop) || !Reflect.has(extended as object, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const value = Reflect.get(extended as object, prop);
        if (typeof value === 'function') {
          return (value as (...a: unknown[]) => unknown).bind(extended);
        }
        return value;
      },
    });
  }

  /** Soft-delete a row by writing `deletedAt = now()`. */
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
