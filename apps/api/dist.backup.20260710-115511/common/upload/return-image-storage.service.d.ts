import { ConfigService } from '@nestjs/config';
export declare class ReturnImageStorageService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    private baseDir;
    private resolveDiskPath;
    store(returnId: string, file: Express.Multer.File): Promise<{
        filePath: string;
        publicUrl: string;
        originalFilename: string;
        mimeType: string;
    }>;
    remove(storedPath: string): Promise<void>;
    read(storedPath: string): Promise<Buffer>;
}
