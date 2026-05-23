const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.join(projectRoot, 'node_modules');
const rootModules = path.join(monorepoRoot, 'node_modules');

const mobileReactNative = path.join(mobileModules, 'react-native');
const mobileVirtualizedLists = path.join(
  mobileReactNative,
  'node_modules',
  '@react-native',
  'virtualized-lists',
);

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
  if (
    moduleName === '@react-native/virtualized-lists' ||
    moduleName.startsWith('@react-native/virtualized-lists/')
  ) {
    if (fs.existsSync(mobileVirtualizedLists)) {
      try {
        return {
          type: 'sourceFile',
          filePath: require.resolve(moduleName, { paths: [mobileVirtualizedLists] }),
        };
      } catch {
        // fall through
      }
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
