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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTrackingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let EmailTrackingController = class EmailTrackingController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async trackClick(logId, targetUrl, res) {
        if (logId) {
            await this.prisma.emailDeliveryLog
                .update({
                where: { id: logId },
                data: { clickCount: { increment: 1 } },
            })
                .catch(() => undefined);
        }
        const fallback = 'https://softdigitconsulting.com';
        let redirect = fallback;
        if (targetUrl) {
            try {
                const decoded = decodeURIComponent(targetUrl);
                if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
                    redirect = decoded;
                }
            }
            catch {
            }
        }
        return res.redirect(302, redirect);
    }
};
exports.EmailTrackingController = EmailTrackingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':logId'),
    (0, swagger_1.ApiOperation)({ summary: 'Track email link clicks and redirect' }),
    __param(0, (0, common_1.Param)('logId')),
    __param(1, (0, common_1.Query)('u')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EmailTrackingController.prototype, "trackClick", null);
exports.EmailTrackingController = EmailTrackingController = __decorate([
    (0, swagger_1.ApiTags)('tracking'),
    (0, common_1.Controller)('t/email'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailTrackingController);
//# sourceMappingURL=email-tracking.controller.js.map