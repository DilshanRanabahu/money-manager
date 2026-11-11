const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @anthropic-ai/sdk's ESM build has import cycles that Metro evaluates in the wrong order
// ("Cannot read property 'BetaToolRunner' of undefined"). Use its CommonJS build instead.
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = moduleName.startsWith('@anthropic-ai/sdk') || context.originModulePath.includes('@anthropic-ai')
    ? { ...context, isESMImport: false, unstable_conditionNames: ['require', 'react-native'] }
    : context;
  return (resolve ?? context.resolveRequest)(ctx, moduleName, platform);
};

module.exports = config;
