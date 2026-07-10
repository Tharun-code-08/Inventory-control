"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNotFuture = assertNotFuture;
exports.assertFuture = assertFuture;
const common_1 = require("@nestjs/common");
function assertNotFuture(date, fieldName = 'Document date') {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date.getTime() > today.getTime()) {
        throw new common_1.BadRequestException(`${fieldName} cannot be in the future`);
    }
}
function assertFuture(date, fieldName = 'Date') {
    const tomorrowStart = new Date();
    tomorrowStart.setHours(0, 0, 0, 0);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    if (date.getTime() < tomorrowStart.getTime()) {
        throw new common_1.BadRequestException(`${fieldName} must be in the future`);
    }
}
//# sourceMappingURL=date-guards.js.map