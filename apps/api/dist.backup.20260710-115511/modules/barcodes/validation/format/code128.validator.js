"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Code128Validator = void 0;
const common_1 = require("@nestjs/common");
let Code128Validator = class Code128Validator {
    async validate(context) {
        const { barcodeValue } = context;
        if (!barcodeValue || barcodeValue.length === 0) {
            throw new common_1.BadRequestException('Code128 barcode cannot be empty');
        }
        if (barcodeValue.length > 30) {
            throw new common_1.BadRequestException('Code128 barcode exceeds maximum length of 30 characters');
        }
    }
};
exports.Code128Validator = Code128Validator;
exports.Code128Validator = Code128Validator = __decorate([
    (0, common_1.Injectable)()
], Code128Validator);
//# sourceMappingURL=code128.validator.js.map