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
exports.UniqueBarcodeValidator = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../prisma/prisma.service");
const barcode_validation_context_interface_1 = require("../barcode-validation-context.interface");
let UniqueBarcodeValidator = class UniqueBarcodeValidator {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validate(context) {
        if (context.operation !== barcode_validation_context_interface_1.BarcodeOperation.CREATE)
            return;
        const existing = await this.prisma.productBarcode.findUnique({
            where: {
                companyId_barcode: {
                    companyId: context.companyId,
                    barcode: context.barcodeValue,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Barcode already assigned to another product');
        }
    }
};
exports.UniqueBarcodeValidator = UniqueBarcodeValidator;
exports.UniqueBarcodeValidator = UniqueBarcodeValidator = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UniqueBarcodeValidator);
//# sourceMappingURL=unique-barcode.validator.js.map