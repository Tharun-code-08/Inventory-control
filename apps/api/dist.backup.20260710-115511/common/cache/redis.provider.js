"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisProvider = exports.REDIS_CLIENT = void 0;
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
exports.REDIS_CLIENT = 'REDIS_CLIENT';
exports.redisProvider = {
    provide: exports.REDIS_CLIENT,
    useFactory: (config) => {
        return new ioredis_1.default({
            host: config.get('REDIS_HOST', '127.0.0.1'),
            port: Number(config.get('REDIS_PORT', '6379')),
            retryStrategy: (times) => Math.min(times * 50, 2000),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            enableOfflineQueue: false,
        });
    },
    inject: [config_1.ConfigService],
};
//# sourceMappingURL=redis.provider.js.map