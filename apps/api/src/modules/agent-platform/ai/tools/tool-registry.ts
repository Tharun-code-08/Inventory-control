import { Injectable, Logger } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import type { AiToolDef } from '../provider/ai-provider.interface';

/**
 * Immutable per-turn execution context (Phase 3). Read tools only need `user`;
 * write tools additionally need the conversation to attach drafted tasks to.
 * Built once per turn by the orchestrator — handlers never receive ad-hoc params.
 */
export type AgentToolContext = Readonly<{
  user: RequestUser;
  /** Set when the turn originates from a chat conversation (Phase 3 write tools require it). */
  companyId?: string;
  conversationId?: string;
  linkId?: string;
}>;

/**
 * Feature-flag buckets a tool belongs to (AiSettings.featureFlags keys).
 * A tenant can switch off a whole assistant area with one flag.
 */
export type AgentFeatureFlag = 'stock' | 'sales' | 'purchase';

export type AgentTool = {
  /** Wire name sent to the AI provider (charset-safe: letters/digits/_/-). */
  name: string;
  /**
   * Canonical `domain.action` id (Phase 3 namespacing), e.g. "purchase.create_po".
   * Defaults to `name` — Phase 2 read tools keep their original names as aliases.
   */
  id?: string;
  description: string;
  /** JSON Schema for the tool input (passed to the AI provider verbatim). */
  inputSchema: Record<string, unknown>;
  /** Existing ERP permission string; tool is hidden without it. */
  requiredPermission?: string;
  featureFlag: AgentFeatureFlag;
  /** Phase 3 metadata. */
  version?: number;
  /** Tool drafts a business action that requires explicit user approval. */
  confirmationRequired?: boolean;
  costLevel?: 'low' | 'medium' | 'high';
  /** Execution must leave an AuditLog trail (enforced by the underlying service). */
  auditRequired?: boolean;
  handler: (ctx: AgentToolContext, input: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Declarative tool registry — adding an assistant capability is registering a
 * tool, never an `if/else` in the orchestrator. Tools map 1:1 onto existing
 * ERP services and run with the linked user's scope, so tenant isolation and
 * permissions are enforced by the same code paths as the API. Write tools
 * (Phase 3) never execute directly: they draft an AgentTask for approval.
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, AgentTool>();
  /** Canonical `domain.action` id → tool (aliases the wire name). */
  private readonly byId = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Agent tool "${tool.name}" is already registered`);
    }
    const id = tool.id ?? tool.name;
    if (this.byId.has(id)) {
      throw new Error(`Agent tool id "${id}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    this.byId.set(id, tool);
    this.logger.log(`Registered agent tool ${tool.name}${tool.id ? ` (${tool.id})` : ''}`);
  }

  /** Resolve by wire name or canonical `domain.action` id. */
  get(nameOrId: string): AgentTool | undefined {
    return this.tools.get(nameOrId) ?? this.byId.get(nameOrId);
  }

  /** Tools visible to this user under the tenant's feature flags. */
  listFor(user: RequestUser, featureFlags: Record<string, boolean>): AgentTool[] {
    return [...this.tools.values()].filter((tool) => {
      if (featureFlags[tool.featureFlag] === false) return false;
      if (tool.requiredPermission && !user.permissions.includes(tool.requiredPermission)) {
        return false;
      }
      return true;
    });
  }

  toDefs(tools: AgentTool[]): AiToolDef[] {
    return tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }));
  }
}
