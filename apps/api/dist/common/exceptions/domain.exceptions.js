"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InactiveEntityException = exports.DocumentAlreadyPostedException = exports.InsufficientStockException = void 0;
const common_1 = require("@nestjs/common");
class InsufficientStockException extends common_1.HttpException {
    details;
    constructor(message, details) {
        super(message, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        this.details = details;
    }
}
exports.InsufficientStockException = InsufficientStockException;
class DocumentAlreadyPostedException extends common_1.HttpException {
    constructor() {
        super('Document is already posted', common_1.HttpStatus.CONFLICT);
    }
}
exports.DocumentAlreadyPostedException = DocumentAlreadyPostedException;
class InactiveEntityException extends common_1.HttpException {
    constructor(entity) {
        super(`${entity} is inactive`, common_1.HttpStatus.BAD_REQUEST);
    }
}
exports.InactiveEntityException = InactiveEntityException;
//# sourceMappingURL=domain.exceptions.js.map