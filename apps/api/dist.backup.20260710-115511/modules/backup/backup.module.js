"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const backup_controller_1 = require("./backup.controller");
const backup_processor_1 = require("./backup.processor");
const backup_service_1 = require("./backup.service");
const google_drive_service_1 = require("./google-drive.service");
const tenant_backup_service_1 = require("./tenant-backup.service");
const billing_module_1 = require("../billing/billing.module");
const audit_module_1 = require("../audit/audit.module");
const backup_constants_1 = require("./backup.constants");
const mail_module_1 = require("../../common/mail/mail.module");
let BackupModule = class BackupModule {
};
exports.BackupModule = BackupModule;
exports.BackupModule = BackupModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: backup_constants_1.BACKUP_QUEUE }), billing_module_1.BillingModule, audit_module_1.AuditModule, mail_module_1.MailModule],
        controllers: [backup_controller_1.BackupController],
        providers: [backup_service_1.BackupService, backup_processor_1.BackupProcessor, google_drive_service_1.GoogleDriveService, tenant_backup_service_1.TenantBackupService],
        exports: [backup_service_1.BackupService],
    })
], BackupModule);
//# sourceMappingURL=backup.module.js.map