# expo-datadog

## Overview

This package contains the Datadog Expo config plugin `expo-datadog`. It requires `@datadog/mobile-react-native` to work.

For more information about using the Expo SDK, see the [Expo and Expo Go documentation][2]. For more information about tracking Expo crash reports, see the [Expo Crash Reporting and Error Tracking documentation][1].

## Contributing

If you find an issue with this package and have a fix, first consult the [Contributing Guidelines][3].

This package has a different versioning system from the other React Native packages, therefore it is out of the workspaces. Run `yarn install` from this directory to install dependencies.

To try a development build plugin on an app, run this commands from this directory:

```sh
yarn clean && yarn build && yarn pack
```

Copy the generated archive to the root of your app and change your `package.json` to install the package from the archive (change the version number accordingly):

```json
"expo-datadog": "./expo-datadog-v45.0.0.tgz",
```

Run `yarn install` from your app and run `expo prebuild` to see changes appear in the native files. If this looks good to you, [start an EAS build][4] to test your changes.

To avoid issues with the `npm` cache, change the name of the archive every time you test a new version, for example: expo-datadog-v45.0.1-test-1.tgz.

[1]: https://docs.datadoghq.com/real_user_monitoring/error_tracking/expo/
[2]: https://docs.datadoghq.com/real_user_monitoring/reactnative/expo/
[3]: https://github.com/DataDog/dd-sdk-reactnative/blob/develop/CONTRIBUTING.md
[4]: https://docs.expo.dev/build/setup/
