import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStockException extends HttpException {
  constructor(
    message: string,
    public readonly details: { productId: string; productCode: string; available: string; requested: string }[],
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DocumentAlreadyPostedException extends HttpException {
  constructor() {
    super('Document is already posted', HttpStatus.CONFLICT);
  }
}

export class InactiveEntityException extends HttpException {
  constructor(entity: string) {
    super(`${entity} is inactive`, HttpStatus.BAD_REQUEST);
  }
}
