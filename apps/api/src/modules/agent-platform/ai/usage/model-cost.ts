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
  const rate = COST_CENTS_PER_MTOK[model];
  if (!rate) return 0;
  return Math.round(
    (inputTokens * rate.input) / 1_000_000 + (outputTokens * rate.output) / 1_000_000,
  );
}
