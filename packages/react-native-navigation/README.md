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

In order to start tracking your navigation events, simply call the add the following lines before setting up your navigation. You can use the optional `ViewNamePredicate` callback to replace the automatically detected View name with something more relevant to your use case, based on the [`ComponentDidAppearEvent`][3].

Returning `null` in the `ViewNamePredicate` prevents the new RUM View from being created. The previous RUM View remains active.

```js
import { DdRumReactNativeNavigationTracking, ViewNamePredicate }  from '@datadog/mobile-react-native-navigation';
import { ComponentDidAppearEvent } from 'react-native-navigation';

const viewNamePredicate: ViewNamePredicate = function customViewNamePredicate(event: ComponentDidAppearEvent, trackedName: string) {
  return "My custom View Name"
}

DdRumReactNativeNavigationTracking.startTracking(viewNamePredicate);
```

[1]: https://github.com/wix/react-native-navigation
[2]: https://github.com/DataDog/dd-sdk-reactnative/tree/main/packages/core
[3]: https://wix.github.io/react-native-navigation/api/events/#componentdidappear
