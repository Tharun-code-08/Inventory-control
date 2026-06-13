import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response, NextFunction } from 'express';
import { RequestContextRequest } from '../types/request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestContextRequest, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
