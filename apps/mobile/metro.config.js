const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// inlineRem 16: the web's rem, so spacing classes (px-5, min-h-11) are the same size in both apps.
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css", inlineRem: 16 });
