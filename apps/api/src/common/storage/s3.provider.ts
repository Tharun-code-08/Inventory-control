import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StoragePublicUrlOptions, StorageWriteResult, StorageWriteOptions } from './storage-provider';

@Injectable()
export class S3Provider implements StorageProvider {
  private readonly logger = new Logger(S3Provider.name);
  private s3Client?: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', 'documents');
  }

  private getClient(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS credentials: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.s3Client;
  }

  async writeBuffer(
    assetKey: string,
    buffer: Buffer,
    options?: StorageWriteOptions,
  ): Promise<StorageWriteResult> {
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: assetKey,
          Body: buffer,
          ContentType: options?.contentType || 'application/octet-stream',
          CacheControl: options?.cacheControl,
        }),
      );

      const url = await this.getSignedUrl(assetKey, 3600); // 1 hour
      return { assetKey, bytes: buffer.length, url };
    } catch (error) {
      this.logger.error(`Failed to write to S3: ${error.message}`, error);
      throw error;
    }
  }

  async readBuffer(assetKey: string): Promise<Buffer> {
    try {
      const response = await this.getClient().send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: assetKey,
        }),
      );
      return Buffer.from(await response.Body?.transformToByteArray() || []);
    } catch (error) {
      this.logger.error(`Failed to read from S3: ${error.message}`, error);
      throw error;
    }
  }

  async deleteObject(assetKey: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: assetKey,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete from S3: ${error.message}`, error);
      throw error;
    }
  }

  async exists(assetKey: string): Promise<boolean> {
    try {
      await this.getClient().send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: assetKey,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Failed to check existence in S3: ${error.message}`, error);
      throw error;
    }
  }

  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string {
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${assetKey}`;
    if (options?.version) {
      return `${url}?v=${options.version}`;
    }
    return url;
  }

  async getSignedUrl(assetKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: assetKey,
      });
      return await getSignedUrl(this.getClient(), command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error);
      throw error;
    }
  }
}
