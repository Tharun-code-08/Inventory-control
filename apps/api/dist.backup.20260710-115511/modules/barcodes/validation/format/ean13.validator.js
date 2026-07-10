"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAN13Validator = void 0;
const common_1 = require("@nestjs/common");
let EAN13Validator = class EAN13Validator {
    async validate(context) {
        const { barcodeValue } = context;
        if (!/^[0-9]{13}$/.test(barcodeValue)) {
            throw new common_1.BadRequestException('EAN13 must be exactly 13 numeric digits');
        }
        if (!this.isValidChecksum(barcodeValue)) {
            throw new common_1.BadRequestException('EAN13 checksum is invalid');
        }
    }
    isValidChecksum(value) {
        const digits = value.split('').map(d => Number(d));
        const sum = digits
            .slice(0, 12)
            .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
        const checksum = (10 - (sum % 10)) % 10;
        return checksum === digits[12];
    }
};
exports.EAN13Validator = EAN13Validator;
exports.EAN13Validator = EAN13Validator = __decorate([
    (0, common_1.Injectable)()
], EAN13Validator);
//# sourceMappingURL=ean13.validator.js.map