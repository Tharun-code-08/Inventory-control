/**
 * Pure policy evaluation (Plan §7). No NestJS, no Prisma — given a fact set and
 * a set of rules, decide which match and merge their actions in priority order
 * (lower `priority` wins on conflict, applied last so it overwrites).
 */
import { Comparator, PolicyCondition, PolicyDecision, PolicyFacts, PolicyRule, Predicate } from './policy-types';

function compare(op: Comparator, left: unknown, right: unknown): boolean {
  switch (op) {
    case 'eq':
      return left === right;
    case 'ne':
      return left !== right;
    case 'gt':
      return typeof left === 'number' && typeof right === 'number' && left > right;
    case 'gte':
      return typeof left === 'number' && typeof right === 'number' && left >= right;
    case 'lt':
      return typeof left === 'number' && typeof right === 'number' && left < right;
    case 'lte':
      return typeof left === 'number' && typeof right === 'number' && left <= right;
    case 'in':
      return Array.isArray(right) && right.includes(left);
    default:
      return false;
  }
}

function isPredicate(c: PolicyCondition): c is Predicate {
  return (c as Predicate).fact !== undefined && (c as Predicate).op !== undefined;
}

export function evaluateCondition(condition: PolicyCondition, facts: PolicyFacts): boolean {
  if (isPredicate(condition)) {
    return compare(condition.op, facts[condition.fact], condition.value);
  }
  if ('all' in condition) return condition.all.every((c) => evaluateCondition(c, facts));
  if ('any' in condition) return condition.any.some((c) => evaluateCondition(c, facts));
  if ('not' in condition) return !evaluateCondition(condition.not, facts);
  return false;
}

/**
 * Evaluate all rules against `facts`. Matching rules are sorted by ascending
 * priority and their actions shallow-merged in that order, so the lowest-priority
 * (most specific) rule's fields take precedence.
 */
export function evaluatePolicies(rules: readonly PolicyRule[], facts: PolicyFacts): PolicyDecision {
  const matched = rules
    .filter((r) => evaluateCondition(r.condition, facts))
    .sort((a, b) => a.priority - b.priority);

  // Apply highest priority number first so the lowest (most specific) overwrites.
  const action = [...matched]
    .reverse()
    .reduce<Record<string, unknown>>((acc, r) => ({ ...acc, ...r.action }), {});

  return { action, matched: matched.map((r) => r.id) };
}
