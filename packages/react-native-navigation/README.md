# React-Native Monitoring for `react-native-navigation` components

Datadog *Real User Monitoring (RUM)* enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users. This specific package adds support to the [`react-native-navigation`][1] library.

## Setup

**Note**: This package is an integration for [`react-native-navigation`][1] library, please make sure you first install and setup the core [`mobile-react-native`][2] SDK.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-navigation
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-navigation
```

### Track view navigation

In order to start tracking your navigation events, simply call the add the following lines before setting up your navigation:

```js
import { DdRumReactNativeNavigationTracking }  from '@datadog/mobile-react-native-navigation';

DdRumReactNativeNavigationTracking.startTracking();
```

[1]: https://github.com/wix/react-native-navigation
[2]: https://github.com/DataDog/dd-sdk-reactnative/tree/main/packages/core
