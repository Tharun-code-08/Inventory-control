import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LinkService } from './link.service';
export declare class LinkTokenCleanupService implements OnModuleInit, OnModuleDestroy {
    private readonly links;
    private readonly logger;
    private expireTimer?;
    private purgeTimer?;
    constructor(links: LinkService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private sweepExpired;
    private sweepPurge;
}
