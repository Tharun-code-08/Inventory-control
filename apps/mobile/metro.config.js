const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.join(projectRoot, 'node_modules');
const rootModules = path.join(monorepoRoot, 'node_modules');

const mobileReactNative = path.join(mobileModules, 'react-native');
// pnpm layout: @react-native/virtualized-lists lives as a sibling of react-native
// inside its .pnpm dir, not nested under react-native/node_modules. Resolve it
// dynamically (with the legacy nested path as a fallback) so a re-hoist can't break it.
let mobileVirtualizedLists = path.join(
  mobileReactNative,
  'node_modules',
  '@react-native',
  'virtualized-lists',
);
try {
  mobileVirtualizedLists = path.dirname(
    require.resolve('@react-native/virtualized-lists/package.json', {
      paths: [mobileReactNative],
    }),
  );
} catch {
  // keep the legacy nested fallback path above
}

const config = getDefaultConfig(projectRoot);

// Monorepo root hoists react-native@0.76 for web; mobile needs 0.81 (Expo SDK 54).
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [mobileModules, rootModules];

const pinToMobile = [
  'react',
  'react-dom',
  'react-native',
  '@react-native/virtualized-lists',
];

config.resolver.extraNodeModules = config.resolver.extraNodeModules ?? {};
for (const name of pinToMobile) {
  let resolved;
  if (name === '@react-native/virtualized-lists' && fs.existsSync(mobileVirtualizedLists)) {
    resolved = mobileVirtualizedLists;
  } else {
    resolved = path.join(mobileModules, name);
  }
  if (fs.existsSync(resolved)) {
    config.resolver.extraNodeModules[name] = resolved;
  }
}

// Never bundle root's @react-native/virtualized-lists@0.76 (breaks FlatList with RN 0.81).
const rootVirtualizedLists = path.join(rootModules, '@react-native', 'virtualized-lists');
if (fs.existsSync(rootVirtualizedLists)) {
  const escaped = rootVirtualizedLists.replace(/[\\]/g, '\\\\');
  config.resolver.blockList = [
    ...(config.resolver.blockList ?? []),
    new RegExp(`${escaped}[\\\\/].*`),
  ];
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // bwip-js default-imports react-zlib-js/buffer.js expecting the Buffer
  // constructor, but that file exports the whole module object — see the shim.
  if (moduleName === 'react-zlib-js/buffer.js' || moduleName === 'react-zlib-js/buffer') {
    return {
      type: 'sourceFile',
      filePath: path.join(projectRoot, 'src', 'lib', 'rn-buffer-shim.js'),
    };
  }

  // The tsconfig `react` paths alias (kept for type resolution) would otherwise
  // leak into Metro and resolve `react` to the types-only @types/react folder,
  // breaking the bundle. Force react + its subpaths to the real runtime package.
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
      };
    } catch {
      // fall through to default resolution
    }
  }

  if (
    moduleName === '@react-native/virtualized-lists' ||
    moduleName.startsWith('@react-native/virtualized-lists/')
  ) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [mobileReactNative] }),
      };
    } catch {
      // fall through
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
