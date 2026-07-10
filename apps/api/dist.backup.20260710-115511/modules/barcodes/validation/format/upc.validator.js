"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPCValidator = void 0;
const common_1 = require("@nestjs/common");
let UPCValidator = class UPCValidator {
    async validate(context) {
        const { barcodeValue } = context;
        if (!/^[0-9]{12}$/.test(barcodeValue)) {
            throw new common_1.BadRequestException('UPC must be exactly 12 numeric digits');
        }
        if (!this.isValidChecksum(barcodeValue)) {
            throw new common_1.BadRequestException('UPC checksum is invalid');
        }
    }
    isValidChecksum(value) {
        const digits = value.split('').map(d => Number(d));
        const oddSum = digits
            .filter((_, i) => i % 2 === 0)
            .reduce((a, b) => a + b, 0);
        const evenSum = digits
            .filter((_, i) => i % 2 === 1)
            .reduce((a, b) => a + b, 0);
        const checksum = (oddSum * 3 + evenSum) % 10;
        return checksum === 0;
    }
};
exports.UPCValidator = UPCValidator;
exports.UPCValidator = UPCValidator = __decorate([
    (0, common_1.Injectable)()
], UPCValidator);
//# sourceMappingURL=upc.validator.js.map