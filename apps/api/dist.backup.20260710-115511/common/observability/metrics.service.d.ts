import { Counter, Histogram, Registry } from 'prom-client';
export declare class MetricsService {
    readonly registry: Registry;
    readonly httpRequestDuration: Histogram<string>;
    readonly bullJobDuration: Histogram<string>;
    readonly prismaQueryDuration: Histogram<string>;
    readonly httpErrors: Counter<string>;
    constructor();
}
