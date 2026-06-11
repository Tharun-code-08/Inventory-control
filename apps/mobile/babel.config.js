const expoRouterBabelPlugin =
  require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      expoRouterBabelPlugin,
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
