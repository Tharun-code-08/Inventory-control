"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCompanyId = assertCompanyId;
function assertCompanyId(user) {
    if (!user.companyId) {
        throw new Error(`Audit log attempted without companyId. userId=${user.id}`);
    }
    return user.companyId;
}
//# sourceMappingURL=assert-company-id.js.map