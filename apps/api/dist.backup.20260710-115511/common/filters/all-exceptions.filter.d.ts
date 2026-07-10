import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    private schemaDriftMessage;
    private normalizeConstraintTarget;
    private constraintTargetsInclude;
    private uniqueConstraintMessage;
    catch(exception: unknown, host: ArgumentsHost): Response<any, Record<string, any>>;
}
