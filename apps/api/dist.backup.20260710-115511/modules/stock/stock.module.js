"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const document_series_module_1 = require("../document-series/document-series.module");
const costing_service_1 = require("./costing.service");
const document_number_service_1 = require("./document-number.service");
const inventory_lot_service_1 = require("./inventory-lot.service");
const inventory_lots_controller_1 = require("./inventory-lots.controller");
const stock_service_1 = require("./stock.service");
let StockModule = class StockModule {
};
exports.StockModule = StockModule;
exports.StockModule = StockModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, document_series_module_1.DocumentSeriesModule],
        controllers: [inventory_lots_controller_1.InventoryLotsController],
        providers: [stock_service_1.StockService, costing_service_1.CostingService, document_number_service_1.DocumentNumberService, inventory_lot_service_1.InventoryLotService],
        exports: [stock_service_1.StockService, costing_service_1.CostingService, document_number_service_1.DocumentNumberService, inventory_lot_service_1.InventoryLotService],
    })
], StockModule);
//# sourceMappingURL=stock.module.js.map