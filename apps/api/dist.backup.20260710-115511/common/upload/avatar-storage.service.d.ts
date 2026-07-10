import { ConfigService } from '@nestjs/config';
export declare class AvatarStorageService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    store(userId: string, file: Express.Multer.File): Promise<string>;
}
