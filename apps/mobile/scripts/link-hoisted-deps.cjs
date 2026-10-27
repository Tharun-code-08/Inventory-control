/**
 * npm workspaces hoist Expo packages to the monorepo root. Metro on Windows
 * often fails to resolve them from apps/mobile — link critical packages locally.
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const monorepoRoot = path.resolve(mobileRoot, '../..');
const mobileNm = path.join(mobileRoot, 'node_modules');
const rootNm = path.join(monorepoRoot, 'node_modules');

const PACKAGES = [
  'expo',
  'expo-asset',
  'expo-constants',
  'expo-font',
  'expo-linking',
  'expo-router',
  'expo-secure-store',
  'expo-status-bar',
  '@expo/metro-runtime',
  '@expo/vector-icons',
  // Never link react / react-native from root — versions differ (RN 0.76 vs mobile 0.81).
  'react-native-safe-area-context',
  'react-native-screens',
  'babel-preset-expo',
  'expo-constants',
  'expo-linking',
  'expo-router',
  '@expo/metro-runtime',
];

const NEVER_LINK_FROM_ROOT = new Set([
  'react',
  'react-dom',
  'react-native',
  '@react-native/virtualized-lists',
]);

function linkPackage(name) {
  if (NEVER_LINK_FROM_ROOT.has(name)) {
    return;
  }
  const src = path.join(rootNm, name);
  const dest = path.join(mobileNm, name);
  if (!fs.existsSync(src)) {
    console.warn(`[link-hoisted-deps] skip ${name}: not in root node_modules`);
    return;
  }
  if (fs.existsSync(dest)) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(src, dest, type);
  console.log(`[link-hoisted-deps] linked ${name}`);
}

if (!fs.existsSync(rootNm)) {
  console.warn('[link-hoisted-deps] root node_modules missing — run npm install from retail-ims/');
  process.exit(0);
}

fs.mkdirSync(mobileNm, { recursive: true });
for (const pkg of PACKAGES) {
  linkPackage(pkg);
}

// Link all expo-* and @expo/* from root (never react/react-native)
for (const entry of fs.readdirSync(rootNm)) {
  if (entry.startsWith('expo-') || entry.startsWith('@expo')) {
    linkPackage(entry);
  }
}

// Config plugins hoisted to the monorepo root resolve `expo/config-plugins`
// from their own path, so expose the mobile workspace's Expo package there.
const rootExpo = path.join(rootNm, 'expo');
const mobileExpo = path.join(mobileNm, 'expo');
if (!fs.existsSync(rootExpo) && fs.existsSync(mobileExpo)) {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(mobileExpo, rootExpo, type);
  console.log('[link-hoisted-deps] linked mobile Expo package to monorepo root');
}

// image-size 2 requires bytes, while Metro 0.83 passes image paths to its API.
const metroAssetsTarget =
  'const isImageInput = assetInfo.files[0].includes(".zip/")\n' +
  '    ? _fs.default.readFileSync(assetInfo.files[0])\n' +
  '    : assetInfo.files[0];';
const metroAssetsReplacement =
  'const isImageInput = assetInfo.files[0].includes(".zip/") || isImage\n' +
  '    ? _fs.default.readFileSync(assetInfo.files[0])\n' +
  '    : assetInfo.files[0];';
const metroAssetFiles = [
  path.join(rootNm, '@expo', 'metro', 'node_modules', 'metro', 'src', 'Assets.js'),
  path.join(rootNm, 'metro', 'src', 'Assets.js'),
  path.join(mobileNm, 'metro', 'src', 'Assets.js'),
];
let metroAssetsPatched = false;
for (const metroAssetFile of metroAssetFiles) {
  if (!fs.existsSync(metroAssetFile)) continue;
  const content = fs.readFileSync(metroAssetFile, 'utf8');
  if (content.includes(metroAssetsReplacement)) {
    metroAssetsPatched = true;
    continue;
  }
  if (!content.includes(metroAssetsTarget)) continue;
  fs.writeFileSync(
    metroAssetFile,
    content.replace(metroAssetsTarget, metroAssetsReplacement),
    'utf8',
  );
  metroAssetsPatched = true;
}
if (!metroAssetsPatched) {
  throw new Error('Could not apply the Metro compatibility fix for image-size 2');
}

// Patch react-zlib-js to prevent Hermes/Metro crash during function toString parsing & Browser load check
const zlibPath = path.join(rootNm, 'react-zlib-js', 'index.js');
if (fs.existsSync(zlibPath)) {
  let content = fs.readFileSync(zlibPath, 'utf8');
  let modified = false;

  const target1 = 'a.hasOwnProperty(d)&&a[d].toString().match(c).slice(1)';
  const replacement1 = 'a.hasOwnProperty(d)&&(a[d].toString().match(c)||[]).slice(1)';
  if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    modified = true;
  }

  const target2 = 'b.memoryInitializerPrefixURL&&(W=b.memoryInitializerPrefixURL+W),v||x)';
  const replacement2 = 'b.memoryInitializerPrefixURL&&(W=b.memoryInitializerPrefixURL+W),v||x||1)';
  if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(zlibPath, content, 'utf8');
    console.log('[link-hoisted-deps] Patched react-zlib-js for Hermes/Browser compatibility');
  }
}
