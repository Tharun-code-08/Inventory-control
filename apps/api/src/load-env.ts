import { config } from 'dotenv';
import { resolveEnvFilePaths } from './config/resolve-env-files';

/**
 * Runs before Nest loads ConfigModule / JwtModule. Later paths override earlier ones.
 */
for (const p of resolveEnvFilePaths(__dirname)) {
  config({ path: p, override: true });
}
