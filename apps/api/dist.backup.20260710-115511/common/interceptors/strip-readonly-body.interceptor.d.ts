import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class StripReadonlyBodyInterceptor implements NestInterceptor {
    private readonly keys;
    constructor(keys?: readonly string[]);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
