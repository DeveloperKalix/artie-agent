const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Essential for Supabase and modern JS libraries
config.resolver.sourceExts.push('cjs');
config.resolver.sourceExts.push('mjs');

module.exports = withNativeWind(config, { input: "./global.css" });