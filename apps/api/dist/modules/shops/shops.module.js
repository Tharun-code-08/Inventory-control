"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopsModule = void 0;
const common_1 = require("@nestjs/common");
const shops_controller_1 = require("./shops.controller");
const shops_service_1 = require("./shops.service");
let ShopsModule = class ShopsModule {
};
exports.ShopsModule = ShopsModule;
exports.ShopsModule = ShopsModule = __decorate([
    (0, common_1.Module)({
        controllers: [shops_controller_1.ShopsController],
        providers: [shops_service_1.ShopsService],
    })
], ShopsModule);
//# sourceMappingURL=shops.module.js.map