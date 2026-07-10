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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    registry = new prom_client_1.Registry();
    httpRequestDuration;
    bullJobDuration;
    prismaQueryDuration;
    httpErrors;
    constructor() {
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'http_request_duration_seconds',
            help: 'HTTP request latency in seconds',
            labelNames: ['route', 'method', 'status'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });
        this.bullJobDuration = new prom_client_1.Histogram({
            name: 'bullmq_job_duration_seconds',
            help: 'BullMQ job execution latency in seconds',
            labelNames: ['queue', 'name', 'status'],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
            registers: [this.registry],
        });
        this.prismaQueryDuration = new prom_client_1.Histogram({
            name: 'prisma_query_duration_seconds',
            help: 'Prisma query latency in seconds',
            labelNames: ['model', 'action'],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [this.registry],
        });
        this.httpErrors = new prom_client_1.Counter({
            name: 'http_errors_total',
            help: 'Total count of HTTP error responses (status >= 500)',
            labelNames: ['route', 'method', 'status'],
            registers: [this.registry],
        });
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map