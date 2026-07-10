import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
export declare class DeprecationInterceptor implements NestInterceptor {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
