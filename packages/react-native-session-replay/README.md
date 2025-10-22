# Session Replay for React Native

Mobile Session Replay expands visibility into your mobile applications by visually replaying each user interaction, such as taps, swipes, and scrolls. Visually replaying user interactions on your applications makes it easier to reproduce crashes and errors, as well as understand the user journey for making UI improvements.

## Setup

**Note**: Make sure you’ve setup and initialized the [Datadog React Native SDK][1] with views instrumentation enabled.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-session-replay
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-session-replay
```

## Enable Session Replay

To enable Session Replay, import and call the `enable` method with your configuration. Below is an example setup:

```js
import { SessionReplay } from "@datadog/mobile-react-native-session-replay";

SessionReplay.enable({
    replaySampleRate: sampleRate, // The percentage of sampled replays, in the range 0.0 - 100.0 (Default: 100.0).
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_ALL, // Defines the way text and input (e.g text fields, checkboxes) should be masked (Default: `MASK_ALL`).
    imagePrivacyLevel: ImagePrivacyLevel.MASK_ALL, // Defines the way images should be masked (Default: `MASK_ALL`).
    touchPrivacyLevel: TouchPrivacyLevel.HIDE  // Defines the way user touches (e.g tap) should be masked (Default: `HIDE`).
});
```

**Note**: All configuration properties are optional and should be adjusted based on your application's needs.

## Start or stop the recording manually

By default, Session Replay starts recording automatically. However, if you prefer to manually start recording at a specific point in your application, you can use the optional `startRecordingImmediately` parameter as shown below, and later call `SessionReplay.startRecording()`. You can also use `SessionReplay.stopRecording()` to stop the recording anytime.

```js
import { SessionReplay } from "@datadog/mobile-react-native-session-replay";

SessionReplay.enable({
  replaySampleRate: sampleRate,
  startRecordingImmediately: false
});
// Do something
SessionReplay.startRecording();
SessionReplay.stopRecording();
```

## SVG Support

Session Replay provides enhanced support for capturing SVG images in your React Native application. To enable SVG tracking, you need to set up the Datadog Babel plugin and Metro plugin.

### Prerequisites

Install the Datadog Babel plugin:

```sh
npm install @datadog/mobile-react-native-babel-plugin
```

or with Yarn:

```sh
yarn add @datadog/mobile-react-native-babel-plugin
```

### Setup Babel Plugin

Configure the Babel plugin in your `babel.config.js` to enable SVG tracking:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        sessionReplay: {
          // SVG tracking is disabled by default
          // Set to true to enable SVG asset extraction
          svgTracking: true
        }
      }
    ]
  ]
};
```

### Setup Metro Plugin

Configure the Metro plugin in your `metro.config.js` to enable automatic SVG asset bundling:

```js
const { withSessionReplayAssetBundler } = require('@datadog/mobile-react-native-session-replay/metro');

module.exports = withSessionReplayAssetBundler({
  /* your existing Metro config */
});
```

The Metro plugin automatically monitors and bundles SVG assets during development and production builds.

### Installation Workflow

When setting up your project or after installing new dependencies, follow this workflow to ensure SVG assets are properly generated for native builds:

```sh
# 1. Install dependencies
yarn install

# 2. Generate Session Replay SVG assets
npx datadog-generate-sr-assets

# 3. Install iOS pods (if building for iOS)
cd ios && pod install && cd ..

# 4. Run your app
yarn ios
# or
yarn android
```

The `datadog-generate-sr-assets` CLI utility scans your codebase for SVG elements and pre-generates optimized assets that will be included in your native builds.

**Note for CI/CD**: If you use continuous integration for your builds, make sure to include these steps in your CI pipeline. The workflow should be: `yarn install` → `npx datadog-generate-sr-assets` → `pod install` (for iOS) → build your app. This ensures SVG assets are properly generated before the native build process.

### Development Workflow

During development, the Metro plugin automatically handles SVG assets created by the Babel plugin:

1. Write your components with SVG elements from `react-native-svg`
2. The Babel plugin extracts and transforms SVG nodes during the build process
3. The Metro plugin detects new SVG assets and automatically bundles them
4. SVG images are seamlessly captured in Session Replay recordings

No manual asset management is required during development.

[1]: https://www.npmjs.com/package/@datadog/mobile-react-native
