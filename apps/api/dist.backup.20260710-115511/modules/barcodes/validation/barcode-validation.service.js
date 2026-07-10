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
exports.BarcodeValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const ean13_validator_1 = require("./format/ean13.validator");
const upc_validator_1 = require("./format/upc.validator");
const qr_validator_1 = require("./format/qr.validator");
const code128_validator_1 = require("./format/code128.validator");
const unique_barcode_validator_1 = require("./business/unique-barcode.validator");
const lifecycle_validator_1 = require("./business/lifecycle.validator");
let BarcodeValidationService = class BarcodeValidationService {
    prisma;
    ean13;
    upc;
    qr;
    code128;
    unique;
    lifecycle;
    formatMap;
    constructor(prisma, ean13, upc, qr, code128, unique, lifecycle) {
        this.prisma = prisma;
        this.ean13 = ean13;
        this.upc = upc;
        this.qr = qr;
        this.code128 = code128;
        this.unique = unique;
        this.lifecycle = lifecycle;
    }
    onModuleInit() {
        this.formatMap = new Map([
            [client_1.BarcodeType.EAN13, this.ean13],
            [client_1.BarcodeType.UPC_A, this.upc],
            [client_1.BarcodeType.QR, this.qr],
            [client_1.BarcodeType.CODE128, this.code128],
        ]);
    }
    async validate(context) {
        const formatValidator = this.formatMap.get(context.barcodeType);
        if (!formatValidator) {
            throw new common_1.BadRequestException(`Unsupported barcode type ${context.barcodeType}`);
        }
        await formatValidator.validate(context);
        await this.unique.validate(context);
        await this.lifecycle.validate(context);
    }
};
exports.BarcodeValidationService = BarcodeValidationService;
exports.BarcodeValidationService = BarcodeValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ean13_validator_1.EAN13Validator,
        upc_validator_1.UPCValidator,
        qr_validator_1.QRValidator,
        code128_validator_1.Code128Validator,
        unique_barcode_validator_1.UniqueBarcodeValidator,
        lifecycle_validator_1.LifecycleValidator])
], BarcodeValidationService);
//# sourceMappingURL=barcode-validation.service.js.map