"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asMoney = asMoney;
exports.assertPositiveMoney = assertPositiveMoney;
exports.assertNonNegativeMoney = assertNonNegativeMoney;
exports.roundMoney = roundMoney;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
function asMoney(value) {
    return new client_1.Prisma.Decimal(value);
}
function assertPositiveMoney(value, fieldName) {
    if (value.lte(0)) {
        throw new common_1.BadRequestException(`${fieldName} must be greater than zero`);
    }
}
function assertNonNegativeMoney(value, fieldName) {
    if (value.lt(0)) {
        throw new common_1.BadRequestException(`${fieldName} cannot be negative`);
    }
}
function roundMoney(value) {
    return value.toDecimalPlaces(2, client_1.Prisma.Decimal.ROUND_HALF_UP);
}
//# sourceMappingURL=money.js.map