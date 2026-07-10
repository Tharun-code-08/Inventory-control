"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSerializableTxWithRetry = runSerializableTxWithRetry;
const client_1 = require("@prisma/client");
function isRetryableSerializationError(error) {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034')
            return true;
    }
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('40001') || message.toLowerCase().includes('serialization');
}
async function runSerializableTxWithRetry(prisma, work, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await prisma.$transaction(work, {
                isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 30_000,
            });
        }
        catch (error) {
            if (isRetryableSerializationError(error) && attempt < maxAttempts) {
                continue;
            }
            throw error;
        }
    }
    throw new Error('Serializable transaction failed after retries');
}
//# sourceMappingURL=serializable-tx.js.map