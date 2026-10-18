/**
 * The context that flows through the notification pipeline (Plan §4). Each stage
 * reads and returns an updated context; no stage references another. Async data
 * (consent, engagement, policy, AI advice) is gathered once by the caller and
 * placed on `gathered`/`precomputed`, keeping every stage pure and unit-testable.
 */
import { EngagementSnapshot } from '../engagement';
import { RateCaps, RateChannel, RateCounts } from '../rate-limit';
import { SendPriority, SendWindowConfig } from '../send-window';
import { PolicyDecision } from '../policy/policy-types';
import { AiRecommendation } from '../ai/ai-advisor';

export interface PipelineInput {
  readonly eventId: string;
  readonly correlationId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly tone: string;
  readonly balanceDue: number;
  readonly daysOverdue: number;
  readonly stepIndex: number;
}

export interface PipelineGathered {
  readonly now: Date;
  readonly consent: { readonly whatsapp: boolean; readonly email: boolean };
  readonly inAppAllowed: boolean;
  readonly engagement?: EngagementSnapshot;
  readonly counts: RateCounts;
  readonly sendWindow: SendWindowConfig;
}

export interface PipelinePrecomputed {
  readonly policy: PolicyDecision;
  readonly advice?: AiRecommendation;
}

/** The accumulating decision. Stages fill this in; the caller executes it. */
export interface PipelineDecision {
  priority: SendPriority;
  caps: RateCaps;
  forcedChannel?: RateChannel;
  suppressed: boolean;
  suppressReason?: string;
  dedupKey?: string;
  channel: RateChannel | null;
  order: RateChannel[];
  sendNow: boolean;
  deferUntil: Date | null;
  reasons: string[];
}

export interface PipelineContext {
  readonly input: PipelineInput;
  readonly gathered: PipelineGathered;
  readonly precomputed: PipelinePrecomputed;
  readonly decision: PipelineDecision;
}

export function initialDecision(): PipelineDecision {
  return {
    priority: 'NORMAL',
    caps: {},
    suppressed: false,
    channel: null,
    order: [],
    sendNow: false,
    deferUntil: null,
    reasons: [],
  };
}
