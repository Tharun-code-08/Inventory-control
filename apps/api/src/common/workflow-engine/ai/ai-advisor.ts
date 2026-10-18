/**
 * AI advisor (Plan §8 "AI Advisor"). The advisor *recommends* channel, tone,
 * timing and escalation — it never decides. The pipeline treats its output as a
 * hint that is always subordinate to consent, quiet hours, rate limits and
 * policy: **AI never bypasses business rules** (Plan §8, §"AI Advisor").
 *
 * `AiAdvisor` is the pluggable seam. `RuleBasedAdvisor` is the deterministic
 * default that needs no external model/API key, so the whole platform builds and
 * runs offline; a real LLM-backed advisor can be swapped in behind the same
 * interface and a feature flag later.
 */
import { computeReliabilityScore, EngagementSnapshot, preferredChannel, preferredSendHour } from '../engagement';

export type AdvisableChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';
export type AdvisableTone = 'friendly' | 'reminder' | 'firm' | 'final' | 'escalation';

export interface AdvisorInput {
  readonly companyId: string;
  readonly customerId: string;
  readonly amount?: number;
  readonly daysOverdue?: number;
  readonly engagement?: EngagementSnapshot;
  /** Observed engagement hours (business-local), for send-time advice. */
  readonly engagementHours?: readonly number[];
}

export interface AiRecommendation {
  readonly channel?: AdvisableChannel;
  readonly tone?: AdvisableTone;
  readonly sendHour?: number;
  readonly escalate?: boolean;
  /** 0..100 — how confident the advisor is; low confidence should be ignored. */
  readonly confidence: number;
  readonly rationale: string;
}

export interface AiAdvisor {
  readonly name: string;
  recommend(input: AdvisorInput): AiRecommendation;
}

/** Pick a tone from how overdue the invoice is (mirrors the dunning ladder). */
function toneForOverdue(daysOverdue: number): AdvisableTone {
  if (daysOverdue < 0) return 'friendly';
  if (daysOverdue === 0) return 'reminder';
  if (daysOverdue <= 3) return 'firm';
  if (daysOverdue <= 7) return 'final';
  return 'escalation';
}

/**
 * Deterministic, explainable advisor. Every recommendation is derived from
 * engagement counters + the overdue/amount facts, so it is fully reproducible
 * and safe to run without any external dependency.
 */
export class RuleBasedAdvisor implements AiAdvisor {
  readonly name = 'rule-based';

  recommend(input: AdvisorInput): AiRecommendation {
    const reasons: string[] = [];

    const channel = input.engagement ? preferredChannel(input.engagement) ?? undefined : undefined;
    if (channel) reasons.push(`prefers ${channel} (engagement)`);

    const daysOverdue = input.daysOverdue ?? -1;
    const tone = toneForOverdue(daysOverdue);
    reasons.push(`tone=${tone} for ${daysOverdue}d overdue`);

    const sendHour = input.engagementHours ? preferredSendHour(input.engagementHours) ?? undefined : undefined;
    if (sendHour !== undefined) reasons.push(`best hour ~${sendHour}:00`);

    const reliability = input.engagement ? computeReliabilityScore(input.engagement) : 50;
    // Advise escalation when a high-value invoice is overdue AND the customer is
    // historically unreliable. Still just advice — the workflow/policy decides.
    const escalate = daysOverdue > 7 && (input.amount ?? 0) >= 100_000 && reliability < 40;
    if (escalate) reasons.push(`escalation advised (₹${input.amount}, reliability ${reliability})`);

    // Confidence scales with how much engagement evidence we have.
    const evidence = input.engagement
      ? input.engagement.opens + input.engagement.clicks + input.engagement.replies + input.engagement.paidCount
      : 0;
    const confidence = Math.min(90, 30 + evidence * 10);

    return { channel, tone, sendHour, escalate, confidence, rationale: reasons.join('; ') };
  }
}
