"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_admin_util_1 = require("./platform-admin.util");
let PlatformAdminGuard = class PlatformAdminGuard {
    config;
    constructor(config) {
        this.config = config;
    }
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user?.email) {
            throw new common_1.ForbiddenException('Platform admin access required. Set PLATFORM_ADMIN_EMAILS on the server and sign in with an allowlisted account.');
        }
        const allowlist = (0, platform_admin_util_1.parsePlatformAdminEmailsFromConfig)(this.config);
        if (allowlist.size === 0) {
            throw new common_1.ForbiddenException('Platform admin allowlist is not configured (PLATFORM_ADMIN_EMAILS)');
        }
        if (!(0, platform_admin_util_1.isPlatformAdminEmail)(user.email, allowlist)) {
            throw new common_1.ForbiddenException('Platform admin access required. Set PLATFORM_ADMIN_EMAILS on the server and sign in with an allowlisted account.');
        }
        return true;
    }
};
exports.PlatformAdminGuard = PlatformAdminGuard;
exports.PlatformAdminGuard = PlatformAdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PlatformAdminGuard);
//# sourceMappingURL=platform-admin.guard.js.map