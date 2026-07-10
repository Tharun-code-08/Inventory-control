"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryLotsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
let InventoryLotsController = class InventoryLotsController {
};
exports.InventoryLotsController = InventoryLotsController;
exports.InventoryLotsController = InventoryLotsController = __decorate([
    (0, swagger_1.ApiTags)('inventory-lots'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('inventory-lots')
], InventoryLotsController);
//# sourceMappingURL=inventory-lots.controller.js.map