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
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let StockService = class StockService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async postMovement(tx, payload) {
        const inQty = new client_1.Prisma.Decimal(payload.inQty);
        const outQty = new client_1.Prisma.Decimal(payload.outQty);
        let value = null;
        if (payload.unitRate !== undefined) {
            const rate = new client_1.Prisma.Decimal(payload.unitRate);
            if (payload.inQty > 0) {
                value = rate.mul(inQty);
            }
            else if (payload.outQty > 0) {
                value = rate.mul(outQty);
            }
        }
        await tx.stockLedger.create({
            data: {
                transactionType: payload.type,
                transactionRef: payload.ref,
                transactionDate: payload.date,
                shopId: payload.shopId,
                productId: payload.productId,
                inQty,
                outQty,
                balanceQty: new client_1.Prisma.Decimal(0),
                unitRate: payload.unitRate !== undefined ? new client_1.Prisma.Decimal(payload.unitRate) : null,
                value,
                remarks: payload.remarks,
                createdById: payload.userId,
            },
        });
    }
};
exports.StockService = StockService;
exports.StockService = StockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockService);
//# sourceMappingURL=stock.service.js.map