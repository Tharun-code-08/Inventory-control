import { ConfigService } from '@nestjs/config';
export type CircuitDependency = 'ai_provider' | 'whatsapp_api' | 'database';
export declare class PlatformHealthService {
    private readonly config;
    private readonly logger;
    private readonly circuits;
    constructor(config: ConfigService);
    recordSuccess(dep: CircuitDependency): void;
    recordFailure(dep: CircuitDependency): void;
    isOpen(dep: CircuitDependency): boolean;
    status(): Record<CircuitDependency, {
        open: boolean;
        consecutiveFailures: number;
        totalFailures: number;
        totalSuccesses: number;
    }>;
    private getOrCreate;
    private threshold;
    private resetTimeoutMs;
}
