import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const limits = {
  appLayoutKb: Number(process.env.BUNDLE_BUDGET_APP_LAYOUT_KB ?? 90),
  productsPageKb: Number(process.env.BUNDLE_BUDGET_PRODUCTS_PAGE_KB ?? 550),
};

function fileKb(path) {
  return statSync(path).size / 1024;
}

function resolveChunk(assetsDir, prefix) {
  const entries = readdirSync(assetsDir);
  const match = entries.find((name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'));
  if (!match) return null;
  return join(assetsDir, match);
}

const assetsDir = join(root, 'apps/web/dist/assets');
const checks = [
  {
    name: 'AppLayout chunk',
    path: resolveChunk(assetsDir, 'AppLayout'),
    limitKb: limits.appLayoutKb,
  },
  {
    name: 'ProductsPage chunk',
    path: resolveChunk(assetsDir, 'ProductsPage'),
    limitKb: limits.productsPageKb,
  },
];

const failures = [];
for (const item of checks) {
  try {
    const kb = fileKb(item.path);
    if (kb > item.limitKb) {
      failures.push(`${item.name} ${kb.toFixed(1)}KB exceeds ${item.limitKb}KB`);
    }
  } catch (error) {
    failures.push(`${item.name} file missing: ${item.path}`);
  }
}

if (failures.length > 0) {
  console.error('Bundle budget check failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('Bundle budget check passed.');
