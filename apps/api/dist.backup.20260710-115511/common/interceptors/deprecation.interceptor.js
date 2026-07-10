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
exports.DeprecationInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const deprecated_decorator_1 = require("../decorators/deprecated.decorator");
let DeprecationInterceptor = class DeprecationInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const meta = this.reflector.getAllAndOverride(deprecated_decorator_1.DEPRECATED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!meta)
            return next.handle();
        const res = context.switchToHttp().getResponse();
        try {
            const sunset = new Date(meta.sunsetAt);
            const sunsetHeader = isNaN(sunset.getTime())
                ? meta.sunsetAt
                : sunset.toUTCString();
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', sunsetHeader);
            if (meta.link) {
                res.setHeader('Link', `<${meta.link}>; rel="deprecation"`);
            }
        }
        catch {
        }
        return next.handle().pipe((0, rxjs_1.tap)(() => undefined));
    }
};
exports.DeprecationInterceptor = DeprecationInterceptor;
exports.DeprecationInterceptor = DeprecationInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], DeprecationInterceptor);
//# sourceMappingURL=deprecation.interceptor.js.map