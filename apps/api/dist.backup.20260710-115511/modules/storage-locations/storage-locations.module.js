"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageLocationsModule = void 0;
const common_1 = require("@nestjs/common");
const storage_locations_controller_1 = require("./storage-locations.controller");
const storage_locations_service_1 = require("./storage-locations.service");
let StorageLocationsModule = class StorageLocationsModule {
};
exports.StorageLocationsModule = StorageLocationsModule;
exports.StorageLocationsModule = StorageLocationsModule = __decorate([
    (0, common_1.Module)({
        controllers: [storage_locations_controller_1.StorageLocationsController],
        providers: [storage_locations_service_1.StorageLocationsService],
        exports: [storage_locations_service_1.StorageLocationsService],
    })
], StorageLocationsModule);
//# sourceMappingURL=storage-locations.module.js.map