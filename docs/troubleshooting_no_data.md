## No data is being sent to Datadog

Use this guide when the SDK is installed, the app compiles but no data is received by Datadog.
It is best to follow these steps in order.

### Check the configuration

Sometimes it can be a small mistake in the configuration. Common things to check:

-   Check that your clientToken and applicationId are correct
-   Check you have not set sessionSamplingRate to something else than 100 (100 is default), or else your session may not be sent
-   If you’ve setup a `Proxy` in the Datadog configuration, check that it is correctly configured
-   Check that you are tracking views (all events must be attached to a view) and sending events

### Look at SDK logs in React Native

-   Set `config.verbosity = SdkVerbosity.DEBUG` (import `SdkVerbosity` from `'@datadog/mobile-react-native'`)
-   Logs will appear in the javascript console, you should expect to see an output like this one:

```
 INFO  DATADOG: Datadog SDK was initialized
 INFO  DATADOG: Datadog SDK is tracking interactions
 INFO  DATADOG: Datadog SDK is tracking XHR resources
 INFO  DATADOG: Datadog SDK is tracking errors
 DEBUG  DATADOG: Starting RUM View “Products” #Products-oaZlP_FVwGM5vtPoup_rT
 DEBUG  DATADOG: Adding RUM Action “RCTView” (TAP)
```

In this example, the first 4 logs indicate that the SDK has been correctly configured, the last 2 ones that some events are supposed to be sent.

#### Possible cause of issue

If on iOS you see some DEBUG logs indicating that logs or RUM events were sent **before** the initialization logs, it might be the cause for the SDK not sending events.

Currently the SDK does not support sending events before initialization, and attempting to do so will put the SDK in a state where it cannot send any data.

#### Solution

##### With `DdSdkReactNative.initialize`

If you use `DdSdkReactNative.initialize` to start the Datadog SDK, call this function in your top-level `index.js` file so the SDK is initialized before your other events are sent.

##### With `DatadogProvider`

Starting from SDK version `1.2.0-beta1`, you can initialize the SDK using the `DatadogProvider` component. This component includes a RUM events buffer that makes sure the SDK is initialized before sending any data to Datadog, which prevents this very issue from happening.

To use it, see our [migration guide](./migrating_to_datadog_provider.md)

### Look at native logs

Looking at native logs can give you more input on what could be going wrong.

#### On iOS

-   Open your project in xcode by running `xed ios`
-   Build your project for a simulator or a device
-   Native logs will appear on the bottom right corner:

![](./xcode-logs.png)

You can filter logs by “DATADOG” and look for any error.

If you are indeed sending events, you should see the following logs:

```
[DATADOG SDK] 🐶 → 10:02:47.398 [DEBUG] ⏳ (rum) Uploading batch...
[DATADOG SDK] 🐶 → 10:02:47.538 [DEBUG]    → (rum) accepted, won't be retransmitted: [response code: 202 (accepted), request ID: AAAABBBB-1111-2222-3333-777788883333]
```

The first one indicates that some data is being sent, the second one that the data has been received.

#### Possible cause of issue

If you see the log below, it means that you have called a RUM method before initialising the SDK.

```
[DATADOG SDK] 🐶 → 10:09:13.621 [WARN] The `Global.rum` was called but no `RUMMonitor` is registered. Configure and register the RUM Monitor globally before invoking the feature:
```

##### Solution with `DdSdkReactNative.initialize`

If you use `DdSdkReactNative.initialize` to start the Datadog SDK, call this function in your top-level `index.js` file so the SDK is initialized before your other events are sent.

###### Solution with `DatadogProvider`

Starting from SDK version `1.2.0-beta1`, you can initialize the SDK using the `DatadogProvider` component. This component includes a RUM events buffer that makes sure the SDK is initialized before sending any data to Datadog, which prevents this very issue from happening.

To use it, see our [migration guide](./migrating_to_datadog_provider.md)

### On Android

-   For a better debugging experience, we recommend to install [pidcat](https://github.com/JakeWharton/pidcat)
    -   pidcat filters the device logs (obtained by `adb logcat`) to only show the one from your application
    -   See [this issue](https://github.com/JakeWharton/pidcat/issues/180#issuecomment-1124019329) for M1 users who don’t have python 2
-   Modify `node_modules/@datadog/mobile-react-native/android/src/main/kotlin/com/datadog/reactnative/DdSdk.kt` to enable verbose logging from the native SDK:

```
    fun initialize(configuration: ReadableMap, promise: Promise) {
        // ...

        datadog.initialize(appContext, credentials, nativeConfiguration, trackingConsent)
        datadog.setVerbosity(Log.VERBOSE) // Add this line

        // ...
    }
```

-   Run the app on a phone connected in debug mode to your laptop (should appear when running `adb devices`), or from an emulator
-   Run `pidcat my.app.package.name` or `adb logcat` from your laptop
-   Look for any error mentioning Datadog

Pidcat output looks like this:

![](./pidcat-logs.png)

You can see in the example above that the last log indicates the batch of RUM data was sent successfully.
