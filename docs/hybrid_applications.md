# Hybrid applications

## Overview

You can use Datadog on the same application both from the React Native and the native sides.

RUM Events are reported as coming from the same application and the same source in Datadog RUM.

## Constraints

A few constraints to keep in mind:

1. For **errors, resources, and interactions tracking**, SDKs can work in 2 ways:
    - Through _auto-instrumentation_ - Some React classes and methods are modified to automate this.
    - Through _manual instrumentation_ - For example, if you want to report something you consider an error but that is not going to crash the app.
      Auto-instrumentation for JavaScript errors, resources, and interactions can only be started from JavaScript code.
2. You cannot initialize more than one instance of the native `DatadogSDK` because it uses a singleton pattern on the native side. That means that once you initialize the native SDK on the native side or on the ReactNative side (by calling `DdSdkReactNative.initialize`) it is initialized for both.
   This means that you can use _manual instrumentation_ on both sides, but _auto-instrumentation_ will only be activated for the side on which the SDK was initialized.
3. If you try to report Datadog RUM events or logs before the initialization, they and future RUM events and logs will not be sent.
4. You cannot change the `source` attribute of a RUM session, so all your RUM events will appear under the same source.

## Solutions

### React Native apps with native content: Initialize the React Native SDK

To initialize the React Native Datadog SDK for RUM, see the [React Native Monitoring documentation][1].

This also initializes the SDK on the native side. You are able to call both the native and React Native SDKs for logs, traces and RUM.

If you are sure that you don't call the native SDK before the React Native SDK this is the solution we recommend.

#### Tracking native RUM Views

Using the `nativeViewTracking` configuration option will create many duplicate views you use a navigation library for your React Native app like `react-navigation`.

If this is the case, track your native RUM Views manually. See our documentation [for iOS][5] and [for Android][6].

#### Tracking native RUM Resources

On iOS, you can track network [requests by monitoring your `URLSession`][9].

On Android, if you use okHttp you can [use our interceptor to automatically track network requests][7]. Alternatively, you can [manually track resources][8].

If you have enabled tracing with your backend, first party hosts for your native RUM Resources will be the same as for your React Native RUM Resources.

#### Potential issues

**You cannot call the native SDK before the React Native SDK has been initialized.**

In this case, initialize the SDK on the native side.

### Native apps with React Native screens: Initialize the SDK on the native side

Initialize the SDK on the native side, by using the official documentation [for iOS][2] and [for Android][3].

#### Instrumenting React Native RUM Views

On iOS, use a `UIKitRUMViewsPredicate` to filter out native views created by your navigation libraries:

```swift
class RNHybridPredicate: UIKitRUMViewsPredicate {
    var defaultPredicate = DefaultUIKitRUMViewsPredicate()

    func rumView(for viewController: UIViewController) -> RUMView? {
        let canonicalClassName = NSStringFromClass(type(of: viewController))
        // Dropping RN Views
        if (canonicalClassName.starts(with: "RN")) {
            return nil
        }

        return defaultPredicate.rumView(for: viewController)
    }
}

// Use it when calling trackUIKitRUMViews
Datadog.Configuration.trackUIKitRUMViews(using: RNHybridPredicate())
```

On Android, use a `ComponentPredicate` to filter out native views created by your navigation libraries:

```kotlin
// Adapt the Fragment type to your View tracking strategy
class RNComponentPredicate : ComponentPredicate<Fragment> {
    override fun accept(component: Fragment): Boolean {
        // Identify and drop react native screen views
        if (component.javaClass.name.startsWith("com.swmansion.rnscreens")) {
            return false
        }
        if (component.javaClass.name.startsWith("com.facebook.react")) {
            return false
        }
        return true
    }

    override fun getViewName(component: Fragment): String? {
        return null
    }
}

// Use it in your configuration
configuration.useViewTrackingStrategy(FragmentViewTrackingStrategy(true, RNComponentPredicate()))
```

Then use `@datadog/mobile-react-navigation` to track your views.

If you have enabled ProGuard obfuscation, add rules to prevent obfuscation of the target packages in release builds.

#### Instrumenting React Native errors, interactions, and resources

Wrap your React Native app with the `DatadogProvider` component to automatically register React Native RUM errors, interactions, and resources:

```javascript
const configuration = {
    trackResources: true,
    trackErrors: true,
    trackInteractions: true
};

const RNApp = props => {
    useEffect(() => {
        /**
         * In here we can put fake values. The only goal of this call
         * is to empty the buffer of RUM events.
         */
        DatadogProvider.initialize({
            clientToken: 'fake_value',
            env: 'fake_value',
            applicationId: 'fake_value'
        });
    }, []);
    const navigationRef = useRef(null);

    return (
        <DatadogProvider configuration={configuration}>
            {/* Content of your app goes here */}
        </DatadogProvider>
    );
};

AppRegistry.registerComponent('RNApp', () => RNApp);
```

To remove duplicated interactions on Android, filter out the React Native interactions on the native side with an `EventMapper`:

```kotlin
class RNActionEventMapper : EventMapper<ActionEvent> {
    override fun map(event: ActionEvent): ActionEvent? {
        var targetClassName = (event.context?.additionalProperties?.get("action.target.classname") as? String)
        if(targetClassName?.startsWith("com.facebook.react") == true) {
            return null
        }
        return event
    }
}

// Use it in your configuration
configuration.setRumActionEventMapper(RNActionEventMapper())
```

If you have enabled ProGuard obfuscation, add rules to prevent obfuscation of the target packages in release builds.

[1]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[2]: https://docs.datadoghq.com/real_user_monitoring/ios/
[3]: https://docs.datadoghq.com/real_user_monitoring/android/
[4]: https://github.com/DataDog/dd-sdk-reactnative/blob/develop/packages/core/src/DdSdkReactNative.tsx#L184
[5]: https://docs.datadoghq.com/real_user_monitoring/ios/advanced_configuration/?tab=swift#custom-views
[6]: https://docs.datadoghq.com/real_user_monitoring/android/advanced_configuration/?tab=kotlin#custom-views
[7]: https://docs.datadoghq.com/real_user_monitoring/android/advanced_configuration/?tab=kotlin#automatically-track-network-requests
[8]: https://docs.datadoghq.com/real_user_monitoring/android/advanced_configuration/?tab=kotlin#custom-resources
[9]: https://docs.datadoghq.com/real_user_monitoring/ios/advanced_configuration/?tab=objectivec#automatically-track-network-requests
