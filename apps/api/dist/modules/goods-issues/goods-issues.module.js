"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodsIssuesModule = void 0;
const common_1 = require("@nestjs/common");
const stock_module_1 = require("../stock/stock.module");
const goods_issues_controller_1 = require("./goods-issues.controller");
const goods_issues_service_1 = require("./goods-issues.service");
let GoodsIssuesModule = class GoodsIssuesModule {
};
exports.GoodsIssuesModule = GoodsIssuesModule;
exports.GoodsIssuesModule = GoodsIssuesModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule],
        controllers: [goods_issues_controller_1.GoodsIssuesController],
        providers: [goods_issues_service_1.GoodsIssuesService],
    })
], GoodsIssuesModule);
//# sourceMappingURL=goods-issues.module.js.map