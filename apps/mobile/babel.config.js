const expoRouterBabelPlugin =
  require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // babel-preset-expo is hoisted to the monorepo root where `expo-router` is not
      // resolvable, so the preset skips this plugin — add it explicitly for Expo Router.
      expoRouterBabelPlugin,
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
    ],
  };
};
