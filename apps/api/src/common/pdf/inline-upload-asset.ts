import * as fs from 'fs/promises';
import * as path from 'path';

const LOCAL_UPLOAD_RE = /^(?:https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?)?\/uploads\/([^?#]+)/i;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * PDFs are rendered from an HTML string, so a relative `/uploads/...` URL (or a
 * legacy `http://localhost:<port>/uploads/...` one stored in old snapshots)
 * never resolves. Inline locally stored images as data URIs; anything else is
 * returned unchanged.
 */
export async function inlineUploadAsset(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const match = LOCAL_UPLOAD_RE.exec(url);
  if (!match) return url;
  const mime = MIME_BY_EXT[path.extname(match[1]).toLowerCase()];
  if (!mime) return url;
  const baseDir = path.resolve(process.env.UPLOAD_STORAGE_DIR ?? './storage/uploads');
  const target = path.resolve(baseDir, decodeURIComponent(match[1]));
  if (!target.startsWith(baseDir + path.sep)) return url;
  try {
    const data = await fs.readFile(target);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return url;
  }
}
