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
var CloudflareR2Provider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareR2Provider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let CloudflareR2Provider = CloudflareR2Provider_1 = class CloudflareR2Provider {
    config;
    logger = new common_1.Logger(CloudflareR2Provider_1.name);
    s3Client;
    bucket;
    accountId;
    constructor(config) {
        this.config = config;
        this.bucket = this.config.get('R2_BUCKET_NAME', 'documents');
        this.accountId = this.config.get('R2_ACCOUNT_ID');
    }
    getClient() {
        if (this.s3Client) {
            return this.s3Client;
        }
        const accountId = this.config.get('R2_ACCOUNT_ID');
        const accessKeyId = this.config.get('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY');
        if (!accountId || !accessKeyId || !secretAccessKey) {
            throw new Error('Missing Cloudflare R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
        }
        this.s3Client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        return this.s3Client;
    }
    async writeBuffer(assetKey, buffer, options) {
        try {
            await this.getClient().send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: assetKey,
                Body: buffer,
                ContentType: options?.contentType || 'application/octet-stream',
                CacheControl: options?.cacheControl,
            }));
            const url = await this.getSignedUrl(assetKey, 3600);
            return { assetKey, bytes: buffer.length, url };
        }
        catch (error) {
            this.logger.error(`Failed to write to R2: ${error.message}`, error);
            throw error;
        }
    }
    async readBuffer(assetKey) {
        try {
            const response = await this.getClient().send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: assetKey,
            }));
            return Buffer.from(await response.Body?.transformToByteArray() || []);
        }
        catch (error) {
            this.logger.error(`Failed to read from R2: ${error.message}`, error);
            throw error;
        }
    }
    async deleteObject(assetKey) {
        try {
            await this.getClient().send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: assetKey,
            }));
        }
        catch (error) {
            this.logger.error(`Failed to delete from R2: ${error.message}`, error);
            throw error;
        }
    }
    async exists(assetKey) {
        try {
            await this.getClient().send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: assetKey,
            }));
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            this.logger.error(`Failed to check existence in R2: ${error.message}`, error);
            throw error;
        }
    }
    getPublicUrl(assetKey, options) {
        const publicDomain = this.config.get('R2_PUBLIC_DOMAIN', `https://${this.bucket}.${this.accountId}.r2.cloudflarestorage.com`);
        const url = `${publicDomain}/${assetKey}`;
        if (options?.version) {
            return `${url}?v=${options.version}`;
        }
        return url;
    }
    async getSignedUrl(assetKey, expiresIn = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: assetKey,
            });
            return await (0, s3_request_presigner_1.getSignedUrl)(this.getClient(), command, { expiresIn });
        }
        catch (error) {
            this.logger.error(`Failed to generate signed URL: ${error.message}`, error);
            throw error;
        }
    }
};
exports.CloudflareR2Provider = CloudflareR2Provider;
exports.CloudflareR2Provider = CloudflareR2Provider = CloudflareR2Provider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudflareR2Provider);
//# sourceMappingURL=cloudflare-r2.provider.js.map