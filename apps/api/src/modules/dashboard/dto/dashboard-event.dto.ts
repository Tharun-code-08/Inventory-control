import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Phase 3 Month 1 — Dashboard telemetry.
 * The thin signal the Week 4 Reality Report reads from the audit log.
 *
 *   opened → VIEW_DASHBOARD          (createdAt → ritual timing)
 *   card   → DASHBOARD_CARD_CLICKED  (firstClick → first-click distribution)
 *   action → DASHBOARD_ACTION_TAKEN  (action     → actions per session)
 */
export class DashboardEventDto {
  @IsIn(['opened', 'card', 'action'])
  type!: 'opened' | 'card' | 'action';

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
}
