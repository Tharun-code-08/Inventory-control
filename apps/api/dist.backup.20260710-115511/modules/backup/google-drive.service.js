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
exports.GoogleDriveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const secret_crypto_1 = require("../../common/utils/secret-crypto");
let GoogleDriveService = class GoogleDriveService {
    config;
    constructor(config) {
        this.config = config;
    }
    missingConfigKeys() {
        const keys = [
            { key: 'GOOGLE_OAUTH_CLIENT_ID', value: this.config.get('GOOGLE_OAUTH_CLIENT_ID') },
            {
                key: 'GOOGLE_OAUTH_CLIENT_SECRET',
                value: this.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
            },
            {
                key: 'GOOGLE_OAUTH_REDIRECT_URI',
                value: this.config.get('GOOGLE_OAUTH_REDIRECT_URI'),
            },
        ];
        return keys.filter((k) => !k.value || !k.value.trim()).map((k) => k.key);
    }
    isConfigured() {
        return this.missingConfigKeys().length === 0;
    }
    encryptionKey() {
        const secret = this.config.get('BACKUP_ENCRYPTION_KEY')?.trim() ||
            this.config.get('MFA_SECRET_ENCRYPTION_KEY')?.trim() ||
            this.config.get('JWT_SECRET')?.trim();
        if (!secret)
            throw new Error('Backup encryption key is not configured');
        return (0, secret_crypto_1.deriveEncryptionKey)(secret);
    }
    encryptTokens(tokens) {
        return (0, secret_crypto_1.encryptSecret)(JSON.stringify(tokens), this.encryptionKey());
    }
    decryptTokens(payload) {
        return JSON.parse((0, secret_crypto_1.decryptSecret)(payload, this.encryptionKey()));
    }
    buildAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
            redirect_uri: this.config.getOrThrow('GOOGLE_OAUTH_REDIRECT_URI'),
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            scope: 'https://www.googleapis.com/auth/drive.file email profile',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async exchangeCode(code) {
        const body = new URLSearchParams({
            code,
            client_id: this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
            client_secret: this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
            redirect_uri: this.config.getOrThrow('GOOGLE_OAUTH_REDIRECT_URI'),
            grant_type: 'authorization_code',
        });
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!res.ok) {
            throw new Error(`Google token exchange failed: ${await res.text()}`);
        }
        const json = (await res.json());
        return {
            ...json,
            expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
        };
    }
    async refreshAccessToken(refreshToken) {
        const body = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
            client_secret: this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
            grant_type: 'refresh_token',
        });
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!res.ok) {
            throw new Error(`Google token refresh failed: ${await res.text()}`);
        }
        const json = (await res.json());
        return {
            ...json,
            refresh_token: refreshToken,
            expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
        };
    }
    async getProfile(accessToken) {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok)
            throw new Error('Failed to load Google profile');
        return (await res.json());
    }
    async ensureFolder(accessToken, folderName, existingFolderId) {
        if (existingFolderId)
            return existingFolderId;
        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const res = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metadata),
        });
        if (!res.ok)
            throw new Error(`Failed to create Drive folder: ${await res.text()}`);
        const json = (await res.json());
        return json.id;
    }
    async uploadFile(args) {
        const boundary = `retail-ims-${Date.now()}`;
        const metadata = JSON.stringify({
            name: args.fileName,
            parents: [args.folderId],
        });
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Type: ${args.mimeType}\r\n\r\n`),
            args.buffer,
            Buffer.from(`\r\n--${boundary}--`),
        ]);
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${args.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });
        if (!res.ok)
            throw new Error(`Drive upload failed: ${await res.text()}`);
        return (await res.json());
    }
};
exports.GoogleDriveService = GoogleDriveService;
exports.GoogleDriveService = GoogleDriveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleDriveService);
//# sourceMappingURL=google-drive.service.js.map