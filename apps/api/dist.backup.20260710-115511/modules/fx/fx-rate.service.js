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
exports.FxRateService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let FxRateService = class FxRateService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRate(base, quote, asOf = new Date()) {
        if (base === quote)
            return new client_1.Prisma.Decimal(1);
        const direct = await this.prisma.fxRate.findFirst({
            where: { base, quote, asOf: { lte: asOf } },
            orderBy: { asOf: 'desc' },
        });
        if (direct)
            return new client_1.Prisma.Decimal(direct.rate);
        const inverse = await this.prisma.fxRate.findFirst({
            where: { base: quote, quote: base, asOf: { lte: asOf } },
            orderBy: { asOf: 'desc' },
        });
        if (inverse)
            return new client_1.Prisma.Decimal(1).div(inverse.rate);
        throw new common_1.NotFoundException(`No FX rate found for ${base}->${quote} at or before ${asOf.toISOString()}`);
    }
    async convert(amount, base, quote, asOf = new Date()) {
        const rate = await this.getRate(base, quote, asOf);
        return new client_1.Prisma.Decimal(amount).mul(rate);
    }
};
exports.FxRateService = FxRateService;
exports.FxRateService = FxRateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FxRateService);
//# sourceMappingURL=fx-rate.service.js.map