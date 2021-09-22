# React-Native Monitoring for `react-navigation` components

Datadog *Real User Monitoring (RUM)* enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users. This specific package adds support to the [`react-navigation`][1] library.

## Setup

**Note**: This package is an integration for [`react-navigation`][1] library, please make sure you first install and setup the core [`mobile-react-native`][2] SDK.

To install with NPM, run:

```sh
npm install @datadog/mobile-react-navigation
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-navigation
```

### Track view navigation

To track changes in navigation as RUM Views, set the `onready` callback of your `NavigationContainer` component as follow. You can use the optional `ViewNamePredicate` parameter to replace the automatically detected View name with something more relevant to your use case.

```js
import * as React from 'react';
import { DdRumReactNavigationTracking, ViewNamePredicate } from '@datadog/mobile-react-navigation';

const viewNamePredicate: ViewNamePredicate = function customViewNamePredicate(trackedView: any, trackedName: string) {
  return "My custom View Name"
}

function App() {
  const navigationRef = React.useRef(null);
  return (
    <View>
      <NavigationContainer ref={navigationRef} onReady={() => {
        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, viewNamePredicate)
      }}>
        // …
      </NavigationContainer>
    </View>
  );
}
```
**Note**: Only one `NavigationContainer` can be tracked at the time. If you need to track another container, stop tracking the previous one first, using `DdRumReactNavigationTracking.stopTrackingViews()`.


[1]: https://github.com/react-navigation/react-navigation
[2]: https://github.com/DataDog/dd-sdk-reactnative/tree/main/packages/core
