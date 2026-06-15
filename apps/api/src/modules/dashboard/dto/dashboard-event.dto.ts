import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Phase 3 Week 4 — Dashboard telemetry (frozen for Reality Validation).
 * The thin signal the Week 4 Reality Report reads from the audit log.
 *
 *   opened              → VIEW_DASHBOARD          (createdAt → ritual timing)
 *   card                → DASHBOARD_CARD_CLICKED  (firstClick → first-click distribution)
 *   action              → DASHBOARD_ACTION_TAKEN  (action     → actions per session)
 *   exit                → DASHBOARD_EXIT          (session metadata → Morning Ritual Score)
 *   attention_resolved  → ATTENTION_ITEM_RESOLVED (itemId     → which item was resolved)
 */
export class DashboardEventDto {
  @IsIn(['opened', 'card', 'action', 'exit', 'attention_resolved'])
  type!: 'opened' | 'card' | 'action' | 'exit' | 'attention_resolved';

  /** Which card. Required for 'card' events; identifies the section acted on. */
  @IsOptional()
  @IsIn(['financial', 'inventory', 'attention', 'recommendations'])
  card?: 'financial' | 'inventory' | 'attention' | 'recommendations';

  /** True when this is the first card touched in the session — the priority signal. */
  @IsOptional()
  @IsBoolean()
  firstClick?: boolean;

  /** Free-form action label, e.g. 'resolve_overdue', 'create_po'. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  /** Client-measured load time in ms (for 'opened'); lets us watch the < 2s budget in the field. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120_000)
  loadTimeMs?: number;

  /** Client-generated session id so opens/clicks/actions can be grouped into one visit. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  // DASHBOARD_EXIT metadata
  /** Session duration in milliseconds (for 'exit' events). */
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  /** Count of unique cards viewed in this session (for 'exit' events). */
  @IsOptional()
  @IsInt()
  @Min(0)
  cardsViewed?: number;

  /** Count of actions taken in this session (for 'exit' events). */
  @IsOptional()
  @IsInt()
  @Min(0)
  actionsTaken?: number;

  /** Which card was opened first (for 'exit' events). */
  @IsOptional()
  @IsIn(['financial', 'inventory', 'attention', 'recommendations'])
  firstCard?: 'financial' | 'inventory' | 'attention' | 'recommendations';

  /** ISO timestamp when session opened (for 'exit' events). */
  @IsOptional()
  @IsString()
  openedAt?: string;

  /** ISO timestamp when session closed (for 'exit' events). */
  @IsOptional()
  @IsString()
  closedAt?: string;

  // ATTENTION_ITEM_RESOLVED metadata
  /** Attention item ID being resolved (for 'attention_resolved' events). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  itemId?: string;

  /** Attention item type (for 'attention_resolved' events), e.g. 'overdue_payments', 'low_stock'. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  itemType?: string;

  /** Resolution method (for 'attention_resolved' events), e.g. 'manual_call', 'reorder', 'dismiss'. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  resolution?: string;
}
