import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'apps/web/dist');
const assetsDir = join(distDir, 'assets');

// Budgets in KB (minified, not gzipped). Set from the sizes at the time with
// some headroom; raise one deliberately when a size increase is intended.
const limits = {
  // The entry chunk includes AppLayout (the app shell) and the router.
  entryJsKb: Number(process.env.BUNDLE_BUDGET_ENTRY_JS_KB ?? process.env.BUNDLE_BUDGET_APP_LAYOUT_KB ?? 90),
  entryCssKb: Number(process.env.BUNDLE_BUDGET_ENTRY_CSS_KB ?? 220),
  vendorReactKb: Number(process.env.BUNDLE_BUDGET_VENDOR_REACT_KB ?? 260),
  productsPageKb: Number(process.env.BUNDLE_BUDGET_PRODUCTS_PAGE_KB ?? 550),
};

/** The entry script or stylesheet, as referenced by the built index.html. */
function entryAsset(pattern) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const match = html.match(pattern);
  return match ? join(distDir, match[1]) : null;
}

/** A named chunk from the vite.config.ts `codeSplitting` groups, e.g. `page-products-<hash>.js`. */
function namedChunk(prefix) {
  const match = readdirSync(assetsDir).find((name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'));
  return match ? join(assetsDir, match) : null;
}

const checks = [
  {
    name: 'Entry JS (app shell)',
    path: entryAsset(/<script type="module"[^>]*src="\/(assets\/[^"]+\.js)"/),
    limitKb: limits.entryJsKb,
  },
  {
    name: 'Entry CSS',
    path: entryAsset(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"/),
    limitKb: limits.entryCssKb,
  },
  { name: 'vendor-react chunk', path: namedChunk('vendor-react'), limitKb: limits.vendorReactKb },
  { name: 'page-products chunk', path: namedChunk('page-products'), limitKb: limits.productsPageKb },
];

// A missing asset fails the check: otherwise a renamed chunk silently turns
// the budget off, which is what happened when the chunk names changed.
const failures = [];
for (const item of checks) {
  if (!item.path) {
    failures.push(`${item.name} not found in apps/web/dist (renamed? update this script)`);
    continue;
  }
  const kb = statSync(item.path).size / 1024;
  console.log(`${item.name}: ${kb.toFixed(1)}KB (budget ${item.limitKb}KB)`);
  if (kb > item.limitKb) {
    failures.push(`${item.name} ${kb.toFixed(1)}KB exceeds ${item.limitKb}KB`);
  }
}

if (failures.length > 0) {
  console.error('Bundle budget check failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('Bundle budget check passed.');
