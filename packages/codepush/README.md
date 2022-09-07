# React-Native Monitoring for AppCenter CodePush

## Setup

**Note**: This package is an integration for the [`react-native-code-push`][1] library. Before using it, you must first install and setup the core [`mobile-react-native`][2] SDK.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-code-push
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-code-push
```

## Initialize the SDK

To initialize the SDK, use `DatadogCodepush.initialize` instead of `DdSdkReactNative.initialize`:

```js
import { DdSdkReactNativeConfiguration } from '@datadog/mobile-react-native';
import { DatadogCodepush } from '@datadog/mobile-react-native-code-push';

const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
    true, // track XHR Resources
    true // track Errors
);

await DatadogCodepush.initialize(config);
```

This method sets your reported version to the same value as the one the [`datadog-ci react-native codepush` command][3] uses when uploading your CodePush bundle and source maps.

## Using AppCenter CodePush without `@datadog/mobile-react-native-code-push`

If you use `datadog-ci react-native upload` to upload your CodePush bundle and source maps with a different format for the version, you can override the reported version in the SDK configuration object by using either:

-   `versionSuffix` (recommended) to add a suffix to the commercial version of your app
-   `version` to completely override the version

[1]: https://github.com/microsoft/react-native-code-push
[2]: https://github.com/DataDog/dd-sdk-reactnative/tree/main/packages/core
[3]: https://github.com/DataDog/datadog-ci/tree/master/src/commands/react-native#codepush
