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
exports.DocumentNumberService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DocumentNumberService = class DocumentNumberService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    yearMonth(d) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        return `${y}${m}`;
    }
    async nextNumber(tx, params) {
        const ym = this.yearMonth(params.date);
        const key = `${params.docType}:${params.shopId}:${ym}`;
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${key}::text))`;
        const existing = await tx.documentSequence.findUnique({
            where: {
                docType_shopId_yearMonth: {
                    docType: params.docType,
                    shopId: params.shopId,
                    yearMonth: ym,
                },
            },
        });
        const nextSeq = (existing?.lastSeq ?? 0) + 1;
        await tx.documentSequence.upsert({
            where: {
                docType_shopId_yearMonth: {
                    docType: params.docType,
                    shopId: params.shopId,
                    yearMonth: ym,
                },
            },
            create: {
                docType: params.docType,
                shopId: params.shopId,
                yearMonth: ym,
                lastSeq: nextSeq,
            },
            update: { lastSeq: nextSeq },
        });
        const padded = String(nextSeq).padStart(5, '0');
        return `${params.prefix}-${ym}-${padded}`;
    }
};
exports.DocumentNumberService = DocumentNumberService;
exports.DocumentNumberService = DocumentNumberService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentNumberService);
//# sourceMappingURL=document-number.service.js.map