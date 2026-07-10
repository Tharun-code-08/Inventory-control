"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdempotentResult = getIdempotentResult;
exports.setIdempotentResult = setIdempotentResult;
exports.tryGetIdempotentResult = tryGetIdempotentResult;
exports.trySetIdempotentResult = trySetIdempotentResult;
const SCOPE_SEPARATOR = ':';
function compose(scope, key) {
    return scope ? `${scope}${SCOPE_SEPARATOR}${key}` : key;
}
async function getIdempotentResult(tx, key, scope) {
    if (!key)
        return null;
    const composed = compose(scope, key);
    const found = await tx.idempotencyKey.findUnique({
        where: { key: composed },
        select: { result: true },
    });
    return found?.result ?? null;
}
async function setIdempotentResult(tx, key, value, userId, scope, ttlSeconds) {
    if (!key)
        return;
    const composed = compose(scope, key);
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    await tx.idempotencyKey.upsert({
        where: { key: composed },
        update: { result: value, userId: userId ?? null, expiresAt },
        create: { key: composed, scope: scope ?? null, result: value, userId: userId ?? null, expiresAt },
    });
}
async function tryGetIdempotentResult(tx, key, scope) {
    try {
        return await getIdempotentResult(tx, key, scope);
    }
    catch {
        return null;
    }
}
async function trySetIdempotentResult(tx, key, value, userId, scope, ttlSeconds) {
    try {
        await setIdempotentResult(tx, key, value, userId, scope, ttlSeconds);
    }
    catch {
    }
}
//# sourceMappingURL=idempotency.js.map