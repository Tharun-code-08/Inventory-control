/**
 * Decision parsing for pending-task replies. Deliberately anchored so a
 * message that merely CONTAINS "yes" (e.g. "yes but change the qty to 25")
 * is NOT a decision — it falls through to the AI with the draft in context,
 * which is how the "edit" approval verb works.
 */
export type ApprovalDecision = 'approve' | 'reject';

const APPROVE_RE =
  /^(?:approve|approved|yes|confirm|confirmed|ok|okay|sure|proceed|go ahead|do it|👍|✅)(?:\s+(?:it|that|task))?(?:\s*#?\d+)?\s*[.!]*$/i;

const REJECT_RE =
  /^(?:reject|rejected|no|cancel|cancelled|canceled|stop|discard|dismiss|never mind|nevermind|❌)(?:\s+(?:it|that|task))?(?:\s*#?\d+)?\s*[.!]*$/i;

export function parseDecision(text: string): ApprovalDecision | null {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  if (APPROVE_RE.test(trimmed)) return 'approve';
  if (REJECT_RE.test(trimmed)) return 'reject';
  return null;
}

/** The task number a decision names ("approve #421"), if any. */
export function decisionTaskNumber(text: string): number | null {
  const match = /#?\s*(\d+)\s*[.!]*$/.exec((text ?? '').trim());
  return match ? Number(match[1]) : null;
}
