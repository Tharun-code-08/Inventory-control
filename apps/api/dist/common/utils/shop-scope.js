"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertShopScope = assertShopScope;
exports.defaultShopFilter = defaultShopFilter;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
function assertShopScope(user, shopId) {
    if (!shopId)
        return;
    if (user.role !== client_1.RoleName.SHOP_USER)
        return;
    if (!user.shopId || user.shopId !== shopId) {
        throw new common_1.ForbiddenException('Shop scope mismatch');
    }
}
function defaultShopFilter(user) {
    if (user.role === client_1.RoleName.SHOP_USER) {
        return user.shopId ?? undefined;
    }
    return undefined;
}
//# sourceMappingURL=shop-scope.js.map