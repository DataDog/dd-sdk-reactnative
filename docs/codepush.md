# CodePush for React Native support

## Overview

Enable React Native Crash Reporting and Error Tracking to get comprehensive crash reports and error trends with Real User Monitoring.

Each time you release a new [CodePush][1] version for your React Native application, you need to upload the source maps to Datadog to unminify errors.

To achieve this, we recommand using `@datadog/mobile-react-native-code-push` in your app and the [datadog-ci][3] `react-native codepush` command to upload your source maps. It will ensure that the version will be consistent in both reported crashes and uploaded source maps.

## Setup

Start by following the [installation steps][2] for installing `@datadog/mobile-react-native`.

Install `@datadog/mobile-react-native-code-push`.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-code-push
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-code-push
```

Replace `DdSdkReactNative.initialize` by `DatadogCodepush.initialize` in your code:

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

## Upload CodePush source maps

Install [`@datadog/datadog-ci`][3] as a development dependency to your project.

To install it with npm:

```sh
npm install @datadog/datadog-ci --save-dev
```

To install it with yarn:

```sh
yarn add -D @datadog/datadog-ci
```

Create an encrypted or gitignored `datadog-ci.json` file at the root of your project containing your API key and the Datadog site (if not `datadoghq.com`):

```json
{
    "apiKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "site": "datadoghq.eu"
}
```

N.B.: You can also export them as `DATADOG_API_KEY` and `DATADOG_SITE` environment variables.

When releasing a new CodePush bundle, specify a directory for outputting the source maps and bundle:

```sh
appcenter codepush release-react -a MyOrganization/MyApplication -d MyDeployment --sourcemap-output --output-dir ./build
```

Then run the `datadog-ci react-native codepush` command by passing the adequate CodePush `app` and `deployment` arguments.

To run it with npm:

```sh
npm run datadog-ci react-native codepush --platform ios --service com.company.app --bundle ./build/CodePush/main.jsbundle --sourcemap ./build/CodePush/main.jsbundle.map --app MyOrganization/MyApplication --deployment MyDeployment
```

To run it with yarn:

```sh
yarn datadog-ci react-native codepush --platform ios --service com.company.app --bundle ./build/CodePush/main.jsbundle --sourcemap ./build/CodePush/main.jsbundle.map --app MyOrganization/MyApplication --deployment MyDeployment
```

## Alternatives

These steps will ensure that the `version` will match the format `{commercialVersion}-codepush.{codePushLabel}`, such as `1.2.4-codepush.v3`.

You can also do that by specifying a `versionSuffix` in the SDK configuration:

```js
const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
    true, // track XHR Resources
    true // track Errors
);

config.versionSuffix = `codepush.${codepushVersion}`; // will result in "1.0.0-codepush.v2"
```

Be aware that to avoid potential version clashes, `versionSuffix` adds a dash (`-`) before the suffix.
You can obtain the `codepushVersion` by hardcoding it or using [`CodePush.getUpdateMetadata`][4].

You can upload your source maps using the [`datadog-ci react-native upload`][5] command, making sure the `--release-version` argument matches the one set in the SDK configuration.

[1]: [https://docs.microsoft.com/en-us/appcenter/distribution/codepush/]
[2]: [https://docs.datadoghq.com/real_user_monitoring/reactnative/]
[3]: [https://github.com/DataDog/datadog-ci]
[4]: [https://docs.microsoft.com/en-us/appcenter/distribution/codepush/rn-api-ref#codepushgetupdatemetadata]
[5]: [https://github.com/DataDog/datadog-ci/tree/master/src/commands/react-native#upload]
