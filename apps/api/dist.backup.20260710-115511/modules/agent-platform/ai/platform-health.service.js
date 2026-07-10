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
var PlatformHealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformHealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let PlatformHealthService = PlatformHealthService_1 = class PlatformHealthService {
    config;
    logger = new common_1.Logger(PlatformHealthService_1.name);
    circuits = new Map();
    constructor(config) {
        this.config = config;
    }
    recordSuccess(dep) {
        const s = this.getOrCreate(dep);
        const wasOpen = this.isOpen(dep);
        s.consecutiveFailures = 0;
        s.openedAt = null;
        s.totalSuccesses++;
        if (wasOpen) {
            this.logger.log(`Circuit ${dep} closed after recovery`);
        }
    }
    recordFailure(dep) {
        const s = this.getOrCreate(dep);
        s.consecutiveFailures++;
        s.totalFailures++;
        if (!s.openedAt && s.consecutiveFailures >= this.threshold()) {
            s.openedAt = Date.now();
            this.logger.warn(`Circuit ${dep} OPEN after ${s.consecutiveFailures} consecutive failures (total failures: ${s.totalFailures})`);
        }
    }
    isOpen(dep) {
        const s = this.getOrCreate(dep);
        if (!s.openedAt)
            return false;
        const elapsed = Date.now() - s.openedAt;
        if (elapsed >= this.resetTimeoutMs()) {
            this.logger.log(`Circuit ${dep} HALF-OPEN (elapsed ${Math.round(elapsed / 1000)}s) — allowing probe`);
            return false;
        }
        return true;
    }
    status() {
        const deps = ['ai_provider', 'whatsapp_api', 'database'];
        return Object.fromEntries(deps.map((dep) => {
            const s = this.getOrCreate(dep);
            return [dep, {
                    open: this.isOpen(dep),
                    consecutiveFailures: s.consecutiveFailures,
                    totalFailures: s.totalFailures,
                    totalSuccesses: s.totalSuccesses,
                }];
        }));
    }
    getOrCreate(dep) {
        let s = this.circuits.get(dep);
        if (!s) {
            s = { consecutiveFailures: 0, openedAt: null, totalFailures: 0, totalSuccesses: 0 };
            this.circuits.set(dep, s);
        }
        return s;
    }
    threshold() {
        return Number(this.config.get('CIRCUIT_BREAKER_THRESHOLD') ?? 5);
    }
    resetTimeoutMs() {
        return Number(this.config.get('CIRCUIT_BREAKER_RESET_MS') ?? 30_000);
    }
};
exports.PlatformHealthService = PlatformHealthService;
exports.PlatformHealthService = PlatformHealthService = PlatformHealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PlatformHealthService);
//# sourceMappingURL=platform-health.service.js.map