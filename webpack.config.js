const createExpoWebpackConfigAsync = require('@expo/webpack-config');

/**
 * Customize Expo's default webpack config.
 * We turn off production minification because our bundled JS currently
 * triggers incorrect hoisting inside the minifier that causes runtime TDZ errors.
 */
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  if (config.mode === 'production') {
    config.optimization = config.optimization ?? {};
    config.optimization.minimize = false;
    config.optimization.minimizer = [];
  }

  return config;
};
