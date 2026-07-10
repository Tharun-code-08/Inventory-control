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
exports.PlatformAuditService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_context_1 = require("../../common/utils/audit-context");
const audit_service_1 = require("../audit/audit.service");
let PlatformAuditService = class PlatformAuditService {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    async logPlatformAction(args) {
        const meta = (0, audit_context_1.auditRequestMetadata)();
        await this.audit.log({
            userId: args.userId,
            companyId: null,
            action: args.auditAction ?? client_1.AuditAction.EXPORT_AUDIT,
            entityType: args.entityType ?? 'PlatformAdmin',
            entityId: args.entityId ?? args.userId,
            newValues: {
                platformAction: args.action,
                adminEmail: args.adminEmail,
                recordCode: args.recordCode ?? null,
                ...args.extra,
            },
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
        });
    }
};
exports.PlatformAuditService = PlatformAuditService;
exports.PlatformAuditService = PlatformAuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], PlatformAuditService);
//# sourceMappingURL=platform-audit.service.js.map