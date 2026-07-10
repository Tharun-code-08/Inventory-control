import { ConfigService } from '@nestjs/config';
export declare const PRODUCT_IMAGE_MAX_BYTES: number;
export declare const PRODUCT_IMAGE_ALLOWED_MIME: Set<string>;
export declare class ProductImageStorageService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    store(productId: string, file: Express.Multer.File): Promise<{
        imageUrl: string;
        thumbnailUrl: string;
    }>;
    remove(urls: Array<string | null | undefined>): Promise<void>;
}
