import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { deriveEncryptionKey, decryptSecret, encryptSecret } from '../../common/utils/secret-crypto';

export type GoogleTokenBundle = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
};

@Injectable()
export class GoogleDriveService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID') &&
        this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET') &&
        this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI'),
    );
  }

  encryptionKey() {
    const secret =
      this.config.get<string>('BACKUP_ENCRYPTION_KEY')?.trim() ||
      this.config.get<string>('MFA_SECRET_ENCRYPTION_KEY')?.trim() ||
      this.config.get<string>('JWT_SECRET')?.trim();
    if (!secret) throw new Error('Backup encryption key is not configured');
    return deriveEncryptionKey(secret);
  }

  encryptTokens(tokens: GoogleTokenBundle) {
    return encryptSecret(JSON.stringify(tokens), this.encryptionKey());
  }

  decryptTokens(payload: string): GoogleTokenBundle {
    return JSON.parse(decryptSecret(payload, this.encryptionKey())) as GoogleTokenBundle;
  }

  buildAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI'),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/drive.file email profile',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleTokenBundle> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI'),
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
    const json = (await res.json()) as GoogleTokenBundle & { expires_in?: number };
    return {
      ...json,
      expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenBundle> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
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
    const json = (await res.json()) as GoogleTokenBundle & { expires_in?: number };
    return {
      ...json,
      refresh_token: refreshToken,
      expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
  }

  async getProfile(accessToken: string) {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to load Google profile');
    return (await res.json()) as { email?: string };
  }

  async ensureFolder(accessToken: string, folderName: string, existingFolderId?: string | null) {
    if (existingFolderId) return existingFolderId;
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
    if (!res.ok) throw new Error(`Failed to create Drive folder: ${await res.text()}`);
    const json = (await res.json()) as { id: string };
    return json.id;
  }

  async uploadFile(args: {
    accessToken: string;
    folderId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
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
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`);
    return (await res.json()) as { id: string; name: string; size?: string };
  }
}
