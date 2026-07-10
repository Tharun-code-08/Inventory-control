"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCostCents = estimateCostCents;
const COST_CENTS_PER_MTOK = {
    'deepseek-chat': { input: 28, output: 42 },
    'deepseek-reasoner': { input: 28, output: 42 },
};
function estimateCostCents(model, inputTokens, outputTokens) {
    const rate = COST_CENTS_PER_MTOK[model];
    if (!rate)
        return 0;
    return Math.round((inputTokens * rate.input) / 1_000_000 + (outputTokens * rate.output) / 1_000_000);
}
//# sourceMappingURL=model-cost.js.map