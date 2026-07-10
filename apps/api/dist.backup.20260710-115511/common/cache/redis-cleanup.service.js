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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RedisCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCleanupService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_provider_1 = require("./redis.provider");
let RedisCleanupService = RedisCleanupService_1 = class RedisCleanupService {
    redis;
    logger = new common_1.Logger(RedisCleanupService_1.name);
    constructor(redis) {
        this.redis = redis;
    }
    async onApplicationShutdown(signal) {
        this.logger.log(`Shutting down Redis connection (signal: ${signal})`);
        try {
            await this.redis.quit();
            this.logger.log('Redis connection closed gracefully');
        }
        catch (err) {
            this.logger.error(`Error closing Redis connection: ${err.message}`, err.stack);
        }
    }
};
exports.RedisCleanupService = RedisCleanupService;
exports.RedisCleanupService = RedisCleanupService = RedisCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_provider_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisCleanupService);
//# sourceMappingURL=redis-cleanup.service.js.map