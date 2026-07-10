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
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const metrics_service_1 = require("./metrics.service");
let MetricsInterceptor = class MetricsInterceptor {
    metrics;
    constructor(metrics) {
        this.metrics = metrics;
    }
    intercept(context, next) {
        if (context.getType() !== 'http')
            return next.handle();
        const httpCtx = context.switchToHttp();
        const req = httpCtx.getRequest();
        const res = httpCtx.getResponse();
        const start = process.hrtime.bigint();
        const route = this.routeOf(req, context);
        const method = req.method;
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => this.record(start, route, method, String(res.statusCode)),
            error: (err) => {
                const status = String(err?.status ?? 500);
                this.record(start, route, method, status);
                if (Number(status) >= 500) {
                    this.metrics.httpErrors.labels(route, method, status).inc();
                }
            },
        }));
    }
    record(startNs, route, method, status) {
        const seconds = Number(process.hrtime.bigint() - startNs) / 1e9;
        this.metrics.httpRequestDuration.labels(route, method, status).observe(seconds);
    }
    routeOf(req, context) {
        const baseUrl = req.baseUrl ?? '';
        const routedPath = req.route?.path;
        if (routedPath)
            return `${baseUrl}${routedPath}`;
        const handler = context.getHandler();
        const ctrl = context.getClass();
        return `${ctrl.name}.${handler.name}`;
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map