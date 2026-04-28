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
exports.StorageLocationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_storage_location_dto_1 = require("./dto/create-storage-location.dto");
const update_storage_location_dto_1 = require("./dto/update-storage-location.dto");
const storage_locations_service_1 = require("./storage-locations.service");
let StorageLocationsController = class StorageLocationsController {
    storageLocations;
    constructor(storageLocations) {
        this.storageLocations = storageLocations;
    }
    list(shopId) {
        return this.storageLocations.list({ shop_id: shopId });
    }
    create(user, dto) {
        return this.storageLocations.create(user, dto);
    }
    get(user, id) {
        return this.storageLocations.get(user, id);
    }
    update(user, id, dto) {
        return this.storageLocations.update(user, id, dto);
    }
    remove(user, id) {
        return this.storageLocations.remove(user, id);
    }
};
exports.StorageLocationsController = StorageLocationsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('storage_location:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageLocationsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('storage_location:write'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_storage_location_dto_1.CreateStorageLocationDto]),
    __metadata("design:returntype", void 0)
], StorageLocationsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('storage_location:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StorageLocationsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('storage_location:write'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_storage_location_dto_1.UpdateStorageLocationDto]),
    __metadata("design:returntype", void 0)
], StorageLocationsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('storage_location:write'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StorageLocationsController.prototype, "remove", null);
exports.StorageLocationsController = StorageLocationsController = __decorate([
    (0, swagger_1.ApiTags)('storage-locations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('storage-locations'),
    __metadata("design:paramtypes", [storage_locations_service_1.StorageLocationsService])
], StorageLocationsController);
//# sourceMappingURL=storage-locations.controller.js.map