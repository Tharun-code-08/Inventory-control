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
exports.ContractsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_contract_dto_1 = require("./dto/create-contract.dto");
const update_contract_dto_1 = require("./dto/update-contract.dto");
const contracts_service_1 = require("./contracts.service");
let ContractsController = class ContractsController {
    contracts;
    constructor(contracts) {
        this.contracts = contracts;
    }
    list(user) {
        return this.contracts.list(user);
    }
    create(user, dto) {
        return this.contracts.create(user, dto);
    }
    get(user, id) {
        return this.contracts.get(user, id);
    }
    update(user, id, dto) {
        return this.contracts.update(user, id, dto);
    }
    activate(user, id) {
        return this.contracts.activate(user, id);
    }
    terminate(user, id) {
        return this.contracts.terminate(user, id);
    }
};
exports.ContractsController = ContractsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:write'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_contract_dto_1.CreateContractDto]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:write'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_contract_dto_1.UpdateContractDto]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:write'),
    (0, common_1.Post)(':id/activate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "activate", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('contract:write'),
    (0, common_1.Post)(':id/terminate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "terminate", null);
exports.ContractsController = ContractsController = __decorate([
    (0, swagger_1.ApiTags)('contracts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('contracts'),
    __metadata("design:paramtypes", [contracts_service_1.ContractsService])
], ContractsController);
//# sourceMappingURL=contracts.controller.js.map