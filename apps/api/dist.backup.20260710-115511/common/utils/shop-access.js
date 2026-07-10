"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyShopInTenant = verifyShopInTenant;
exports.repairOrphanShopsForUser = repairOrphanShopsForUser;
const common_1 = require("@nestjs/common");
const shop_scope_1 = require("./shop-scope");
async function verifyShopInTenant(prisma, user, shopId) {
    if ((0, shop_scope_1.isShopScopedRole)(user.role)) {
        (0, shop_scope_1.assertShopScope)(user, shopId);
        return;
    }
    if (!user.companyId) {
        (0, shop_scope_1.assertShopScope)(user, shopId);
        return;
    }
    const scope = (0, shop_scope_1.tenantCompanyShopWhere)(user);
    if (!scope) {
        (0, shop_scope_1.assertShopScope)(user, shopId);
        return;
    }
    const shop = await prisma.shop.findFirst({
        where: { id: shopId, ...scope },
        select: { id: true, companyId: true },
    });
    if (!shop) {
        throw new common_1.ForbiddenException('Plant is outside your organisation');
    }
}
async function repairOrphanShopsForUser(prisma, user) {
    if (!user.companyId)
        return;
    const companyUsers = await prisma.user.findMany({
        where: { shop: { companyId: user.companyId } },
        select: { id: true },
    });
    const creatorIds = [...new Set([user.id, ...companyUsers.map((row) => row.id)])];
    await prisma.shop.updateMany({
        where: {
            companyId: null,
            createdById: { in: creatorIds },
        },
        data: { companyId: user.companyId },
    });
}
//# sourceMappingURL=shop-access.js.map