import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response, NextFunction } from 'express';
import { RequestContextRequest } from '../types/request-context';
import { RequestContextStore } from '../context/request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestContextRequest, res: Response, next: NextFunction) {
    // Keep the id requestContextMiddleware already chose, so the response,
    // logs, audit rows and outbox all carry the same one.
    const requestId = req.requestId ?? RequestContextStore.getRequestId() ?? randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
