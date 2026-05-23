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
