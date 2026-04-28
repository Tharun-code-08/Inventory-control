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
exports.ResponseEnvelopeInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const skip_envelope_decorator_1 = require("../decorators/skip-envelope.decorator");
let ResponseEnvelopeInterceptor = class ResponseEnvelopeInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const skip = this.reflector.getAllAndOverride(skip_envelope_decorator_1.SKIP_ENVELOPE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) {
            return next.handle();
        }
        return next.handle().pipe((0, operators_1.map)((payload) => {
            if (payload && typeof payload === 'object' && 'success' in payload) {
                return payload;
            }
            if (payload &&
                typeof payload === 'object' &&
                'data' in payload &&
                'meta' in payload) {
                const p = payload;
                return { success: true, data: p.data, meta: p.meta, message: p.message };
            }
            return { success: true, data: payload };
        }));
    }
};
exports.ResponseEnvelopeInterceptor = ResponseEnvelopeInterceptor;
exports.ResponseEnvelopeInterceptor = ResponseEnvelopeInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], ResponseEnvelopeInterceptor);
//# sourceMappingURL=response-envelope.interceptor.js.map