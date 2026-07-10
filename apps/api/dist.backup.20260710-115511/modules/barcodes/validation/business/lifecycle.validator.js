"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleValidator = void 0;
const common_1 = require("@nestjs/common");
const barcode_validation_context_interface_1 = require("../barcode-validation-context.interface");
const client_1 = require("@prisma/client");
let LifecycleValidator = class LifecycleValidator {
    async validate(context) {
        const { operation, status } = context;
        if (!status)
            return;
        if (status !== client_1.LifecycleStatus.ACTIVE &&
            status !== client_1.LifecycleStatus.INACTIVE &&
            status !== client_1.LifecycleStatus.REPLACED) {
            throw new common_1.BadRequestException(`Unsupported lifecycle status ${status}`);
        }
        switch (operation) {
            case barcode_validation_context_interface_1.BarcodeOperation.CREATE:
                if (status === client_1.LifecycleStatus.REPLACED) {
                    throw new common_1.BadRequestException('Cannot create a barcode with REPLACED status');
                }
                break;
            case barcode_validation_context_interface_1.BarcodeOperation.DEACTIVATE:
                if (status !== client_1.LifecycleStatus.ACTIVE) {
                    throw new common_1.BadRequestException('Can only deactivate an ACTIVE barcode');
                }
                break;
            case barcode_validation_context_interface_1.BarcodeOperation.REPLACE:
                if (status !== client_1.LifecycleStatus.ACTIVE) {
                    throw new common_1.BadRequestException('Can only replace an ACTIVE barcode');
                }
                break;
            default:
                break;
        }
    }
};
exports.LifecycleValidator = LifecycleValidator;
exports.LifecycleValidator = LifecycleValidator = __decorate([
    (0, common_1.Injectable)()
], LifecycleValidator);
//# sourceMappingURL=lifecycle.validator.js.map