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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let QueueConfig = class QueueConfig {
    config;
    constructor(config) {
        this.config = config;
    }
    getRedisConnection() {
        return {
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get('REDIS_PORT', 6379),
            password: this.config.get('REDIS_PASSWORD'),
            db: this.config.get('REDIS_DB', 0),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            enableOfflineQueue: true,
        };
    }
    getQueueConfig(_queueName) {
        return {
            connection: this.getRedisConnection(),
            settings: {
                retryProcessDelay: 5000,
                stalledInterval: 5000,
                maxStalledCount: 2,
                lockDuration: 30000,
                lockRenewTime: 15000,
            },
        };
    }
};
exports.QueueConfig = QueueConfig;
exports.QueueConfig = QueueConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QueueConfig);
//# sourceMappingURL=queue.config.js.map