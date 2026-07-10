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
exports.RfqsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_rfq_dto_1 = require("./dto/create-rfq.dto");
const update_rfq_dto_1 = require("./dto/update-rfq.dto");
const rfqs_service_1 = require("./rfqs.service");
let RfqsController = class RfqsController {
    rfqs;
    constructor(rfqs) {
        this.rfqs = rfqs;
    }
    list(user) {
        return this.rfqs.list(user);
    }
    create(user, dto) {
        return this.rfqs.create(user, dto);
    }
    get(user, id) {
        return this.rfqs.get(user, id);
    }
    fulfillment(user, id) {
        return this.rfqs.fulfillment(user, id);
    }
    deletionImpact(user, id) {
        return this.rfqs.deletionImpact(user, id);
    }
    update(user, id, dto, ifUnmodifiedSince) {
        return this.rfqs.update(user, id, {
            ...dto,
            ifUnmodifiedSince: dto.ifUnmodifiedSince ?? ifUnmodifiedSince,
        });
    }
    send(user, id) {
        return this.rfqs.send(user, id);
    }
    resendInvites(user, id) {
        return this.rfqs.resendInvites(user, id);
    }
    close(user, id) {
        return this.rfqs.close(user, id);
    }
    remove(user, id) {
        return this.rfqs.remove(user, id);
    }
};
exports.RfqsController = RfqsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_rfq_dto_1.CreateRfqDto]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:read'),
    (0, common_1.Get)(':id/fulfillment'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "fulfillment", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:read'),
    (0, common_1.Get)(':id/deletion-impact'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "deletionImpact", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('if-unmodified-since')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_rfq_dto_1.UpdateRfqDto, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Post)(':id/send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "send", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Post)(':id/resend-invites'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "resendInvites", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Post)(':id/close'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "close", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('rfq:write'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RfqsController.prototype, "remove", null);
exports.RfqsController = RfqsController = __decorate([
    (0, swagger_1.ApiTags)('rfqs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('rfqs'),
    __metadata("design:paramtypes", [rfqs_service_1.RfqsService])
], RfqsController);
//# sourceMappingURL=rfqs.controller.js.map