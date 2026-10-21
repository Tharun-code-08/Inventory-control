import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

/** Ports a tenant-supplied SMTP server may use. */
export const ALLOWED_SMTP_PORTS: ReadonlySet<number> = new Set([25, 465, 587, 2525]);

function ipv4IsPrivate(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return ipv4IsPrivate(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4IsPrivate(mapped[1]);
  return (
    v6 === '::' ||
    v6 === '::1' ||
    v6.startsWith('fc') ||
    v6.startsWith('fd') ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith('ff')
  );
}

/**
 * Rejects SMTP targets that would make the API server connect to its own
 * network (SSRF): non-mail ports and hosts resolving to private addresses.
 */
export async function assertPublicSmtpTarget(host: string, port: number): Promise<void> {
  if (!ALLOWED_SMTP_PORTS.has(port)) {
    throw new BadRequestException(`SMTP port must be one of ${[...ALLOWED_SMTP_PORTS].join(', ')}`);
  }
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((r) => r.address);
  } catch {
    throw new BadRequestException('SMTP host could not be resolved');
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new BadRequestException('SMTP host must be a public mail server');
  }
}
