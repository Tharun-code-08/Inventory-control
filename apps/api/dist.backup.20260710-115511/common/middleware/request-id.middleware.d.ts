import { NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestContextRequest } from '../types/request-context';
export declare class RequestIdMiddleware implements NestMiddleware {
    use(req: RequestContextRequest, res: Response, next: NextFunction): void;
}
