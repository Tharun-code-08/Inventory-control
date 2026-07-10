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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const link_dto_1 = require("../dto/link.dto");
const link_service_1 = require("./link.service");
let LinkController = class LinkController {
    links;
    constructor(links) {
        this.links = links;
    }
    generate(user, req) {
        return this.links.generateLinkToken(user, req.ip, req.headers['user-agent']);
    }
    listDevices(user) {
        return this.links.listDevices(user);
    }
    renameDevice(user, id, dto) {
        return this.links.renameDevice(user, id, dto.nickname);
    }
    revokeDevice(user, id) {
        return this.links.revokeDevice(user, id);
    }
    getStatus(user) {
        return this.links.getStatus(user);
    }
    unlink(user) {
        return this.links.unlink(user);
    }
};
exports.LinkController = LinkController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a short-lived WhatsApp link token for the current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({ summary: 'List linked WhatsApp devices for the current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "listDevices", null);
__decorate([
    (0, common_1.Patch)('devices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Rename a linked WhatsApp device' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, link_dto_1.RenameDeviceDto]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "renameDevice", null);
__decorate([
    (0, common_1.Delete)('devices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a linked WhatsApp device' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "revokeDevice", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Current WhatsApp link status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke all WhatsApp links for the current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LinkController.prototype, "unlink", null);
exports.LinkController = LinkController = __decorate([
    (0, swagger_1.ApiTags)('Agent Platform'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('agent-platform/whatsapp/link'),
    __metadata("design:paramtypes", [link_service_1.LinkService])
], LinkController);
//# sourceMappingURL=link.controller.js.map