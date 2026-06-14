import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response, NextFunction } from 'express';
import { RequestContextRequest } from '../types/request-context';
import { requestContextStorage } from '../observability/request-context.als';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestContextRequest, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    // Run the rest of the request within an AsyncLocalStorage context so the
    // request id is available to downstream code (e.g. audit logging) without
    // having to be threaded through every service call.
    requestContextStorage.run({ requestId }, () => next());
  }
}
