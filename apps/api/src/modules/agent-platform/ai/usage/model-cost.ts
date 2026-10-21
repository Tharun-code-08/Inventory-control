/**
 * Cost estimation table: US-cents per **million** tokens, keyed by model id.
 * Data (not behavior) — unknown models simply meter at 0 cost until added.
 * Source: DeepSeek pricing (cache-miss input rate) as of late 2025 — verify
 * at https://api-docs.deepseek.com/quick_start/pricing when rates change.
 */
const COST_CENTS_PER_MTOK: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 28, output: 42 },
  'deepseek-reasoner': { input: 28, output: 42 },
};

export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return Math.round(exactCostCents(model, inputTokens, outputTokens));
}

/**
 * Unrounded cost in cents. A typical turn costs a fraction of a cent, so
 * budgets must be checked against token totals, not summed rounded costs.
 */
export function exactCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const rate = COST_CENTS_PER_MTOK[model];
  if (!rate) return 0;
  return (inputTokens * rate.input) / 1_000_000 + (outputTokens * rate.output) / 1_000_000;
}

/** Models the platform has pricing for (and so may bill tenants for). */
export function pricedModels(): string[] {
  return Object.keys(COST_CENTS_PER_MTOK);
}
