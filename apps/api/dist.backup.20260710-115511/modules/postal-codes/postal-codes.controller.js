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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const postal_codes_service_1 = require("./postal-codes.service");
let PostalCodesController = class PostalCodesController {
    postalCodes;
    constructor(postalCodes) {
        this.postalCodes = postalCodes;
    }
    lookup(postalCode) {
        return this.postalCodes.lookup(postalCode);
    }
};
exports.PostalCodesController = PostalCodesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':postalCode'),
    (0, swagger_1.ApiOperation)({ summary: 'Lookup city and state for a postal code' }),
    __param(0, (0, common_1.Param)('postalCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PostalCodesController.prototype, "lookup", null);
exports.PostalCodesController = PostalCodesController = __decorate([
    (0, swagger_1.ApiTags)('postal-codes'),
    (0, common_1.Controller)('postal-codes'),
    __metadata("design:paramtypes", [postal_codes_service_1.PostalCodesService])
], PostalCodesController);
//# sourceMappingURL=postal-codes.controller.js.map