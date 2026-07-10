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
var S3Provider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Provider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let S3Provider = S3Provider_1 = class S3Provider {
    config;
    logger = new common_1.Logger(S3Provider_1.name);
    s3Client;
    bucket;
    region;
    constructor(config) {
        this.config = config;
        this.region = this.config.get('AWS_REGION', 'us-east-1');
        this.bucket = this.config.get('AWS_S3_BUCKET', 'documents');
    }
    getClient() {
        if (this.s3Client) {
            return this.s3Client;
        }
        const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');
        if (!accessKeyId || !secretAccessKey) {
            throw new Error('Missing AWS credentials: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
        }
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
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
            this.logger.error(`Failed to write to S3: ${error.message}`, error);
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
            this.logger.error(`Failed to read from S3: ${error.message}`, error);
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
            this.logger.error(`Failed to delete from S3: ${error.message}`, error);
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
            this.logger.error(`Failed to check existence in S3: ${error.message}`, error);
            throw error;
        }
    }
    getPublicUrl(assetKey, options) {
        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${assetKey}`;
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
exports.S3Provider = S3Provider;
exports.S3Provider = S3Provider = S3Provider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Provider);
//# sourceMappingURL=s3.provider.js.map