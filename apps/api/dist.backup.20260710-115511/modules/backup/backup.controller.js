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
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const multer_1 = require("multer");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const skip_envelope_decorator_1 = require("../../common/decorators/skip-envelope.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const backup_service_1 = require("./backup.service");
let BackupController = class BackupController {
    backup;
    constructor(backup) {
        this.backup = backup;
    }
    status(user) {
        return this.backup.getStatus(user);
    }
    listArtifacts(user) {
        return this.backup.listArtifacts(user);
    }
    createJob(user, body) {
        const provider = body?.provider === 'GOOGLE_DRIVE'
            ? client_1.BackupProvider.GOOGLE_DRIVE
            : body?.provider === 'EMAIL'
                ? client_1.BackupProvider.EMAIL
                : client_1.BackupProvider.MANUAL;
        return this.backup.createBackupJob(user, provider);
    }
    getJob(user, id) {
        return this.backup.getBackupJob(user, id);
    }
    googleConnect(user) {
        return this.backup.buildGoogleConnectUrl(user);
    }
    async googleCallback(code, state, res) {
        try {
            await this.backup.completeGoogleConnect(code, state);
            return res.redirect(this.backup.googleRedirectSuccessUrl());
        }
        catch (err) {
            const reason = err instanceof Error && err.message ? encodeURIComponent(err.message) : 'google_oauth_error';
            return res.redirect(`${this.backup.googleRedirectErrorUrl()}?reason=${reason}`);
        }
    }
    disconnectGoogle(user) {
        return this.backup.disconnectGoogle(user);
    }
    uploadArtifact(user, file) {
        return this.backup.saveUploadedArtifact(user, file);
    }
    async downloadArtifact(user, id, res) {
        const artifact = await this.backup.getArtifactDownloadPath(user, id);
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
        return (0, fs_1.createReadStream)(artifact.storagePath).pipe(res);
    }
    dryRun(user, body) {
        return this.backup.dryRunRestore(user, body.artifactId);
    }
    apply(user, body) {
        return this.backup.applyRestore(user, body.restoreJobId, body.confirmationToken);
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('artifacts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "listArtifacts", null);
__decorate([
    (0, common_1.Post)('jobs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "getJob", null);
__decorate([
    (0, common_1.Get)('google/connect'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "googleConnect", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Delete)('google/connect'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "disconnectGoogle", null);
__decorate([
    (0, common_1.Post)('artifacts/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "uploadArtifact", null);
__decorate([
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, common_1.Get)('artifacts/:id/download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "downloadArtifact", null);
__decorate([
    (0, common_1.Post)('restore/dry-run'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "dryRun", null);
__decorate([
    (0, common_1.Post)('restore/apply'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "apply", null);
exports.BackupController = BackupController = __decorate([
    (0, swagger_1.ApiTags)('backups'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('backups'),
    __metadata("design:paramtypes", [backup_service_1.BackupService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map