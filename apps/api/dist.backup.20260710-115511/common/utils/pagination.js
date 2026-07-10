"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampTake = clampTake;
exports.prismaCursorArgs = prismaCursorArgs;
exports.buildMeta = buildMeta;
function clampTake(take) {
    const t = take ?? 20;
    if (t < 1)
        return 1;
    if (t > 100)
        return 100;
    return t;
}
function prismaCursorArgs(page) {
    const take = clampTake(page.take);
    if (!page.cursor) {
        return { take: take + 1 };
    }
    return { take: take + 1, skip: 1, cursor: { id: page.cursor } };
}
function buildMeta(rows, take) {
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
    return { items, meta: { nextCursor, limit: take, hasMore } };
}
//# sourceMappingURL=pagination.js.map