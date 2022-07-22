# expo-datadog

Datadog Real User Monitoring (RUM) enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users.

This package contains the Datadog Expo config plugin and exports the Datadog React Native SDK.

## Setup

To install with NPM, run:

```sh
npm install expo-datadog
```

To install with Yarn, run:

```sh
yarn add expo-datadog
```

### Usage

Please refer to the [Expo documentation][1] for usage.

### Expo SDK versions support

`expo-datadog` supports Expo starting from SDK 45.

`expo-datadog` versions follows Expo versions - if you use Expo SDK 45, use `expo-datadog` version `45.x.x`.

## Contributing

Please refer to the [Contributing Guidelines][2].

To try a development build plugin on an app, run from the root of `dd-sdk-react-native`:

-   `(cd packages/expo && yarn clean && yarn build)`
-   `yarn workspace expo-datadog pack`

Copy the generated archive to the root of your app, and change your `package.json` to install the package from the archive (change the version number accordingly):

```json
"expo-datadog": "./expo-datadog-v45.0.0.tgz",
```

Run `yarn install` from your app, then run `expo prebuild` to see the changes in the native files. If it looks good to you, [start an EAS build][3] to test your changes.

**N.B.**: To avoid issues with the npm cache, change the name of the archive every time you test a new version (e.g. expo-datadog-v45.0.1-test-1.tgz).

[1]: https://docs.datadoghq.com/real_user_monitoring/reactnative/expo/
[2]: https://github.com/DataDog/dd-sdk-reactnative/blob/develop/CONTRIBUTING.md
[3]: https://docs.expo.dev/build/setup/
