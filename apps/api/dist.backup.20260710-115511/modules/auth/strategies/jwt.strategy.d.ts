import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestUser } from '../../../common/types/request-user';
type JwtPayload = {
    sub: string;
    pwd?: string;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(prisma: PrismaService, config: ConfigService);
    validate(payload: JwtPayload): Promise<RequestUser>;
}
export {};
