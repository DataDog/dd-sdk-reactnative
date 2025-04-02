import {
  DatadogProviderConfiguration,
  InternalLog,
  SdkVerbosity,
  DdSdkReactNative,
} from '@datadog/mobile-react-native';

const credentials = require('./config/credentials.json');
const config = new DatadogProviderConfiguration(
  credentials.clientToken,
  credentials.environment,
  credentials.applicationId,
  true, // Track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
  true, // Track XHR Resources
  true, // Track Errors
);

// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true;
// Optional: Select your Datadog website (one of "US", "EU" or "GOV")
config.site = 'US';
// Optional: Sample RUM sessions (in this example, 80% of session are sent to Datadog. Default is 100%)
config.sessionSamplingRate = 100;

config.appHangThreshold = 3.0;
config.trackNonFatalAnrs = true;

console.log('Config is:\n', JSON.stringify(config, null, 2));

InternalLog.verbosity = SdkVerbosity.DEBUG;

export {config};

export const onSDKInitialized = () => {
  DdSdkReactNative.setAttributes({
    profile_mode: 'wall',
    chat_enabled: true,
    campaign_origin: 'example_ad_network',
  });
};
