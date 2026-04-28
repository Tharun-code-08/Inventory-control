/**
 * Run the Nest API with cwd = apps/api so .env, Prisma, and paths resolve the same as
 * when you `cd apps/api && npm run start:dev`. Monorepo `npm run dev` otherwise keeps cwd
 * at the repo root and breaks JWT / DATABASE_URL for many setups.
 */
const { spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const apiDir = path.join(repoRoot, 'apps', 'api');

const child = spawn('npm', ['run', 'start:dev'], {
  cwd: apiDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code === 0 || code === null ? 0 : code);
});
