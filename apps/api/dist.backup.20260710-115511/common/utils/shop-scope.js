"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isShopScopedRole = isShopScopedRole;
exports.tenantCompanyShopWhere = tenantCompanyShopWhere;
exports.assertShopScope = assertShopScope;
exports.defaultShopFilter = defaultShopFilter;
exports.shopIdsForUser = shopIdsForUser;
exports.companyIdForUser = companyIdForUser;
exports.requireCompanyId = requireCompanyId;
exports.assertCompanyScope = assertCompanyScope;
exports.companyListWhere = companyListWhere;
exports.assertCompanyInTenant = assertCompanyInTenant;
exports.userListWhere = userListWhere;
exports.assertUserInTenant = assertUserInTenant;
exports.shopListWhere = shopListWhere;
exports.storageLocationListWhere = storageLocationListWhere;
exports.supplierListWhere = supplierListWhere;
exports.assertSupplierInTenant = assertSupplierInTenant;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const SHOP_SCOPED_ROLES = new Set([
    client_1.RoleName.SHOP_USER,
    client_1.RoleName.WAREHOUSE_STAFF,
    client_1.RoleName.EMPLOYEE,
    client_1.RoleName.SALES,
    client_1.RoleName.VIEWER,
    client_1.RoleName.VENDOR,
]);
function isShopScopedRole(role) {
    return SHOP_SCOPED_ROLES.has(role);
}
function tenantCompanyShopWhere(actor) {
    if (!actor.companyId || isShopScopedRole(actor.role))
        return null;
    return {
        OR: [
            { companyId: actor.companyId },
            { companyId: null, createdById: actor.id },
        ],
    };
}
function assertShopScope(user, shopId) {
    if (!shopId)
        return;
    if (isShopScopedRole(user.role)) {
        if (!user.shopId || user.shopId !== shopId) {
            throw new common_1.ForbiddenException('Shop scope mismatch');
        }
        return;
    }
    const tenantShops = shopIdsForUser(user);
    if (tenantShops && tenantShops.length > 0) {
        if (!tenantShops.includes(shopId)) {
            throw new common_1.ForbiddenException('Shop scope mismatch');
        }
        return;
    }
    if (user.companyId) {
        throw new common_1.ForbiddenException('Shop scope mismatch');
    }
    if (user.shopId) {
        if (user.shopId !== shopId) {
            throw new common_1.ForbiddenException('Shop scope mismatch');
        }
        return;
    }
    throw new common_1.ForbiddenException('Shop scope mismatch');
}
function defaultShopFilter(user) {
    if (isShopScopedRole(user.role)) {
        return user.shopId ?? undefined;
    }
    if (user.companyId && user.shopId) {
        return user.shopId;
    }
    return undefined;
}
function shopIdsForUser(user) {
    if (user.tenantShopIds && user.tenantShopIds.length > 0) {
        return user.tenantShopIds;
    }
    if (user.shopId) {
        return [user.shopId];
    }
    return undefined;
}
function companyIdForUser(user) {
    return user.companyId ?? undefined;
}
function requireCompanyId(user) {
    const companyId = companyIdForUser(user);
    if (!companyId) {
        throw new common_1.ForbiddenException('Organisation scope is required');
    }
    return companyId;
}
function assertCompanyScope(user, companyId) {
    if (!companyId)
        return;
    if (user.companyId && user.companyId !== companyId) {
        throw new common_1.ForbiddenException('Company scope mismatch');
    }
}
function companyListWhere(actor) {
    const companyId = companyIdForUser(actor);
    if (companyId) {
        return { id: companyId };
    }
    return { id: { in: [] } };
}
function assertCompanyInTenant(actor, targetCompanyId) {
    const companyId = requireCompanyId(actor);
    if (targetCompanyId !== companyId) {
        throw new common_1.ForbiddenException('Company is outside your organisation');
    }
}
function userListWhere(actor) {
    const tenantShops = shopIdsForUser(actor);
    if (tenantShops && tenantShops.length > 0) {
        return { shopId: { in: tenantShops } };
    }
    if (actor.shopId) {
        return { shopId: actor.shopId };
    }
    if (actor.companyId) {
        return { shop: { companyId: actor.companyId } };
    }
    return { shopId: { in: [] } };
}
function assertUserInTenant(actor, targetShopId) {
    if (!actor.companyId && !actor.shopId) {
        throw new common_1.ForbiddenException('Organisation scope is required');
    }
    assertShopScope(actor, targetShopId);
    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
        if (!targetShopId || !actor.tenantShopIds.includes(targetShopId)) {
            throw new common_1.ForbiddenException('User is outside your organisation');
        }
    }
}
function shopListWhere(actor) {
    const companyScope = tenantCompanyShopWhere(actor);
    if (companyScope)
        return companyScope;
    const tenantShops = shopIdsForUser(actor);
    if (tenantShops && tenantShops.length > 0) {
        return { id: { in: tenantShops } };
    }
    if (actor.shopId) {
        return { id: actor.shopId };
    }
    return { id: { in: [] } };
}
function storageLocationListWhere(actor, shopId) {
    const companyId = companyIdForUser(actor);
    if (shopId) {
        assertShopScope(actor, shopId);
        if (companyId) {
            return { shopId, shop: { companyId } };
        }
        return { shopId };
    }
    if (companyId) {
        return {
            OR: [
                { shop: { companyId } },
                { shop: { companyId: null, createdById: actor.id } },
            ],
        };
    }
    const tenantShops = shopIdsForUser(actor);
    if (tenantShops && tenantShops.length > 0) {
        return { shopId: { in: tenantShops } };
    }
    if (actor.shopId) {
        return { shopId: actor.shopId };
    }
    return { shopId: { in: [] } };
}
function supplierListWhere(actor) {
    const companyId = requireCompanyId(actor);
    return { companyId };
}
function assertSupplierInTenant(actor, supplierCompanyId) {
    const companyId = requireCompanyId(actor);
    if (supplierCompanyId !== companyId) {
        throw new common_1.ForbiddenException('Supplier is outside your organisation');
    }
}
//# sourceMappingURL=shop-scope.js.map