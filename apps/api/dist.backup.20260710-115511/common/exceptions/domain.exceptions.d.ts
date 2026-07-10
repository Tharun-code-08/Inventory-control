import { HttpException } from '@nestjs/common';
export declare class InsufficientStockException extends HttpException {
    readonly details: {
        productId: string;
        productCode: string;
        available: string;
        requested: string;
    }[];
    constructor(message: string, details: {
        productId: string;
        productCode: string;
        available: string;
        requested: string;
    }[]);
}
export declare class DocumentAlreadyPostedException extends HttpException {
    constructor();
}
export declare class InactiveEntityException extends HttpException {
    constructor(entity: string);
}
