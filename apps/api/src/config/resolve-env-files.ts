import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Env files in load order (later `dotenv` / ConfigModule entries override earlier ones).
 * Paths are de-duplicated by realpath. `compiledDirname` should be `__dirname` of the caller
 * (e.g. `dist` or `src` under `apps/api`).
 */
export function resolveEnvFilePaths(compiledDirname: string): string[] {
  const raw = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps', 'api', '.env'),
    resolve(join(compiledDirname, '..', '.env')),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    const abs = resolve(p);
    if (!existsSync(abs) || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}
