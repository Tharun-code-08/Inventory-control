import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { compileWorkflow } from './workflow-compiler';
import { CompiledWorkflow, WorkflowGraphDef } from './graph-types';
import { SYSTEM_WORKFLOWS } from './default-workflows';

export interface PublishedWorkflow {
  readonly graphId: string;
  readonly version: number;
  readonly workflow: CompiledWorkflow;
}

/**
 * Registry + versioning for workflow graphs (Plan §6, §"Workflow Versioning").
 *
 * Publishing compiles the authored graph and, only if it is valid, writes an
 * immutable {@link WorkflowVersion} row (status PUBLISHED) plus denormalised
 * {@link WorkflowNode} rows, and bumps the graph's latestVersion. Existing
 * versions are never mutated, so running threads pinned to an older version are
 * unaffected — the core §6 guarantee.
 *
 * Resolution is tenant-first: a company's own published graph wins, otherwise
 * the system default (companyId = null) applies.
 */
@Injectable()
export class WorkflowRegistryService {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private static readonly CACHE_TTL_MS = 60_000;
  private readonly publishedCache = new Map<string, { at: number; value: PublishedWorkflow | null }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Seed/refresh the system default graphs. Idempotent; safe on every boot. */
  async seedSystemWorkflows(): Promise<void> {
    for (const def of SYSTEM_WORKFLOWS) {
      const existing = await this.prisma.workflowGraph.findFirst({
        where: { companyId: null, key: def.key },
        include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1 } },
      });
      // Only (re)publish the system default when it is absent — never clobber a
      // published version, to honour immutability.
      if (existing && existing.versions.length > 0) continue;
      await this.publish(null, def);
      this.logger.log(`Seeded system workflow "${def.key}".`);
    }
  }

  /** Compile + publish a new immutable version of a graph. Throws on invalid graphs. */
  async publish(companyId: string | null, def: WorkflowGraphDef): Promise<PublishedWorkflow> {
    const compiled = compileWorkflow(def);
    if (!compiled.ok) {
      const detail = compiled.errors.map((e) => `${e.code}${e.nodeKey ? `@${e.nodeKey}` : ''}: ${e.message}`).join('; ');
      throw new Error(`Cannot publish workflow "${def.key}": ${detail}`);
    }

    const published = await this.prisma.$transaction(async (tx) => {
      // findFirst + create rather than upsert: the composite unique (companyId,
      // key) can't be used as a where-unique when companyId is null (system
      // default graphs), which Prisma types as non-nullable.
      const graph =
        (await tx.workflowGraph.findFirst({ where: { companyId, key: def.key } })) ??
        (await tx.workflowGraph.create({
          data: { companyId, key: def.key, name: def.name, latestVersion: 0 },
        }));
      const version = graph.latestVersion + 1;

      const created = await tx.workflowVersion.create({
        data: {
          graphId: graph.id,
          version,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          document: def as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.workflowNode.createMany({
        data: def.nodes.map((n) => ({
          versionId: created.id,
          nodeKey: n.key,
          kind: n.kind,
          config: n as unknown as Prisma.InputJsonValue,
        })),
      });

      await tx.workflowGraph.update({
        where: { id: graph.id },
        data: { latestVersion: version, name: def.name },
      });

      return { graphId: graph.id, version, workflow: compiled.workflow };
    });
    // A new version invalidates every cached resolution (tenants may fall back
    // to a system default that just changed).
    this.publishedCache.clear();
    return published;
  }

  /** Resolve the currently-published workflow for a tenant (falls back to system). */
  async getPublished(companyId: string, key: string): Promise<PublishedWorkflow | null> {
    // Compiled-workflow cache (Plan §10 "Caching"): the published graph changes
    // only on publish, but is read on every dunning tick — cache the compiled
    // result briefly. publish() clears the cache for its key.
    const cacheKey = `${companyId}:${key}`;
    const hit = this.publishedCache.get(cacheKey);
    if (hit && Date.now() - hit.at < WorkflowRegistryService.CACHE_TTL_MS) return hit.value;

    const graph =
      (await this.loadGraphWithLatest(companyId, key)) ?? (await this.loadGraphWithLatest(null, key));
    const value = !graph || graph.versions.length === 0 ? null : this.toPublished(graph.id, graph.versions[0]);
    this.publishedCache.set(cacheKey, { at: Date.now(), value });
    return value;
  }

  /** Load a specific pinned version (for a running thread). */
  async getVersion(companyId: string, key: string, version: number): Promise<PublishedWorkflow | null> {
    const graph =
      (await this.prisma.workflowGraph.findFirst({ where: { companyId, key } })) ??
      (await this.prisma.workflowGraph.findFirst({ where: { companyId: null, key } }));
    if (!graph) return null;
    const row = await this.prisma.workflowVersion.findUnique({
      where: { graphId_version: { graphId: graph.id, version } },
    });
    if (!row) return null;
    return this.toPublished(graph.id, row);
  }

  private async loadGraphWithLatest(companyId: string | null, key: string) {
    return this.prisma.workflowGraph.findFirst({
      where: { companyId, key },
      include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  private toPublished(graphId: string, row: { version: number; document: Prisma.JsonValue }): PublishedWorkflow {
    const def = row.document as unknown as WorkflowGraphDef;
    const compiled = compileWorkflow(def);
    if (!compiled.ok) {
      // A stored version failing to compile means data corruption; fail loudly.
      throw new Error(`Stored workflow version ${row.version} no longer compiles.`);
    }
    return { graphId, version: row.version, workflow: compiled.workflow };
  }
}
