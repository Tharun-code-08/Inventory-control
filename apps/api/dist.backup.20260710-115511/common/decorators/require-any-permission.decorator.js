"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAnyPermission = exports.PERMISSIONS_ANY_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_ANY_KEY = 'permissions_any';
const RequireAnyPermission = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_ANY_KEY, permissions);
exports.RequireAnyPermission = RequireAnyPermission;
//# sourceMappingURL=require-any-permission.decorator.js.map