"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LinkTokenCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkTokenCleanupService = void 0;
const common_1 = require("@nestjs/common");
const link_service_1 = require("./link.service");
const EXPIRE_SWEEP_MS = 10 * 60_000;
const PURGE_SWEEP_MS = 24 * 3_600_000;
let LinkTokenCleanupService = LinkTokenCleanupService_1 = class LinkTokenCleanupService {
    links;
    logger = new common_1.Logger(LinkTokenCleanupService_1.name);
    expireTimer;
    purgeTimer;
    constructor(links) {
        this.links = links;
    }
    onModuleInit() {
        this.expireTimer = setInterval(() => void this.sweepExpired(), EXPIRE_SWEEP_MS);
        this.purgeTimer = setInterval(() => void this.sweepPurge(), PURGE_SWEEP_MS);
        this.expireTimer.unref();
        this.purgeTimer.unref();
    }
    onModuleDestroy() {
        if (this.expireTimer)
            clearInterval(this.expireTimer);
        if (this.purgeTimer)
            clearInterval(this.purgeTimer);
    }
    async sweepExpired() {
        try {
            const count = await this.links.expireStaleTokens();
            if (count > 0)
                this.logger.log(`Expired ${count} stale link token(s)`);
        }
        catch (err) {
            this.logger.warn(`Token expiry sweep failed: ${err.message}`);
        }
    }
    async sweepPurge() {
        try {
            const count = await this.links.purgeOldTokens();
            if (count > 0)
                this.logger.log(`Purged ${count} old link token(s)`);
        }
        catch (err) {
            this.logger.warn(`Token purge sweep failed: ${err.message}`);
        }
    }
};
exports.LinkTokenCleanupService = LinkTokenCleanupService;
exports.LinkTokenCleanupService = LinkTokenCleanupService = LinkTokenCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [link_service_1.LinkService])
], LinkTokenCleanupService);
//# sourceMappingURL=link-token-cleanup.service.js.map