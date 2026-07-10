import { ConfigService } from '@nestjs/config';
export type GoogleTokenBundle = {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
    scope?: string;
    token_type?: string;
};
export declare class GoogleDriveService {
    private readonly config;
    constructor(config: ConfigService);
    missingConfigKeys(): string[];
    isConfigured(): boolean;
    encryptionKey(): NonSharedBuffer;
    encryptTokens(tokens: GoogleTokenBundle): string;
    decryptTokens(payload: string): GoogleTokenBundle;
    buildAuthUrl(state: string): string;
    exchangeCode(code: string): Promise<GoogleTokenBundle>;
    refreshAccessToken(refreshToken: string): Promise<GoogleTokenBundle>;
    getProfile(accessToken: string): Promise<{
        email?: string;
    }>;
    ensureFolder(accessToken: string, folderName: string, existingFolderId?: string | null): Promise<string>;
    uploadFile(args: {
        accessToken: string;
        folderId: string;
        fileName: string;
        mimeType: string;
        buffer: Buffer;
    }): Promise<{
        id: string;
        name: string;
        size?: string;
    }>;
}
