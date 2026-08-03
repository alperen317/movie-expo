// getSentryExpoConfig is a drop-in replacement for expo/metro-config's
// getDefaultConfig: same config, plus the debug-id annotations that let Sentry
// match a minified release stack trace back to the source map uploaded by the
// @sentry/react-native/expo build plugin. Without it, production crash reports
// point at bundle offsets instead of files.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
