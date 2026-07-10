"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermission = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermission = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermission = RequirePermission;
//# sourceMappingURL=require-permission.decorator.js.map