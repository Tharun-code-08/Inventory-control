import { BeforeApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
export declare class BullShutdownService implements BeforeApplicationShutdown {
    private readonly moduleRef;
    private readonly queueNames;
    private readonly logger;
    constructor(moduleRef: ModuleRef, queueNames?: string[] | null);
    beforeApplicationShutdown(signal?: string): Promise<void>;
}
