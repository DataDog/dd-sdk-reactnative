# Expo guide

Datadog's SDK officially supports Expo!

From **@datadog/dd-sdk-reactnative:1.0.0-rc9** you can just follow the [React Native installation steps][1].
No config plugin is needed.
We also recommend to be at least on **Expo SDK 45** as previous Expo versions might require some manual steps.

If you are using Expo Go, you will need to either switch to development builds (recommended) or you can keep using Expo Go without Datadog while having it run on your standalone app (not recommended).

## Switching from Expo Go to development builds

[Development builds][2] of your app are Debug builds containing the `expo-dev-client` package.

First you need to [enable custom native code to run][3] by running `expo run:android` and `expo run:ios`.

You can then [build your app with the `expo-dev-client` package][4] to execute your added native code in dev mode.
To do this, you need to `expo install expo-dev-client` then run `expo start --dev-client` to start using your development app.

## Developing with Expo Go

When your app runs inside of Expo Go, you can't add any custom native code that is not part of the Expo Go app.
Unfortunately, the Datadog React Native SDK relies on some custom native code to run.

So you can't use Datadog inside Expo Go yet, but you can still develop your app inside Expo Go without Datadog, then use Datadog in your standalone builds.

<details>
<summary>If you want to keep using Expo Go (not recommended)</summary>
If you want to use Datadog with your standalone app and keep using Expo Go in development, you might have noticed that your app now crashes on Expo Go.
This is because you are trying to call native code that is not included.

To prevent your app from crashing in Expo Go, you can add the following file to your project:

```typescript
// mockDatadog.ts
import { NativeModules } from 'react-native';

if (__DEV__) {
    const emptyAsyncFunction = () => new Promise<void>(resolve => resolve());

    NativeModules.DdSdk = {
        initialize: emptyAsyncFunction,
        setUser: emptyAsyncFunction,
        setAttributes: emptyAsyncFunction,
        setTrackingConsent: emptyAsyncFunction
    };

    NativeModules.DdLogs = {
        debug: emptyAsyncFunction,
        info: emptyAsyncFunction,
        warn: emptyAsyncFunction,
        error: emptyAsyncFunction
    };

    NativeModules.DdTrace = {
        startSpan: emptyAsyncFunction,
        finishSpan: emptyAsyncFunction
    };

    NativeModules.DdRum = {
        startView: emptyAsyncFunction,
        stopView: emptyAsyncFunction,
        startAction: emptyAsyncFunction,
        stopAction: emptyAsyncFunction,
        addAction: emptyAsyncFunction,
        startResource: emptyAsyncFunction,
        stopResource: emptyAsyncFunction,
        addError: emptyAsyncFunction,
        addTiming: emptyAsyncFunction
    };
}
```

Then import it before initializing the SDK:

```typescript
import './mockDatadog';
import { DdSdkReactNative } from '@datadog/mobile-react-native';

const config = new DdSdkReactNativeConfiguration(/* your config */);
DdSdkReactNative.initialize(config);
```

</details>

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://github.com/DataDog/dd-sdk-android
[2]: https://docs.expo.dev/development/introduction/
[3]: https://docs.expo.dev/workflow/customizing/#releasing-apps-with-custom-native-code-to
[4]: https://docs.expo.dev/development/getting-started/
