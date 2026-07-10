export declare function deriveEncryptionKey(secret: string, salt?: string): NonSharedBuffer;
export declare function encryptSecret(secret: string, key: Buffer): string;
export declare function decryptSecret(payload: string, key: Buffer): string;
export declare function sha256Hex(buffer: Buffer): string;
