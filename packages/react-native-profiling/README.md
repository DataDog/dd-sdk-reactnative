# Profiling for React Native

The Datadog Profiler continuously collects samples of your application's native call stacks, letting you see which methods consume the most CPU and wall time in production. This package exposes the **native** (iOS and Android) profilers to React Native applications.

## Requirements

-   iOS: no additional requirement beyond the Datadog React Native SDK's minimum deployment target (iOS 12.0).
-   Android 15 (API level 35) or higher. On older Android versions, enabling profiling is a no-op: the call resolves successfully and the rest of your application is unaffected, but no profiles are collected. Your application's `minSdkVersion` does not need to change.

## Setup

**Note**: Make sure you've set up and initialized the [Datadog React Native SDK][1].

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-profiling
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-profiling
```

## Enable Profiling

Import and call the `enable` method **after** `DdSdkReactNative.initialize` has resolved, since the profiler attaches to the already-initialized SDK instance:

```js
import { DdSdkReactNative } from '@datadog/mobile-react-native';
import { DdProfiling } from '@datadog/mobile-react-native-profiling';

await DdSdkReactNative.initialize(config);

await DdProfiling.enable({
    applicationLaunchSampleRate: 5, // The percentage of sampled application launches, in the range 0.0 - 100.0 (Default: 5.0).
    continuousSampleRate: 5 // The percentage of sampled sessions profiled continuously, in the range 0.0 - 100.0 (Default: 5.0).
});
```

All configuration properties are optional. Calling `DdProfiling.enable()` with no argument applies the defaults above.

### Configuration

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `applicationLaunchSampleRate` | `number` | `5` | The sampling rate for application-launch profiling, in the range `0`-`100`. |
| `continuousSampleRate` | `number` | `5` | The sampling rate for continuous profiling, in the range `0`-`100`. |
| `customEndpoint` | `string` | — | Custom server URL for sending profiling data. |

## When profiles are collected

Setting a sampling rate above `0` does not mean every profiling window produces a profile. Both
platforms apply the same rule:

**A continuous profile is only uploaded if the profiling window captured a long task, an app
hang/ANR, or a RUM vital.** Windows in which the app was idle are profiled and then discarded, so
an app sitting on a static screen will not produce profiles no matter how high the sampling rate
is. RUM *actions* — taps and scrolls — do not qualify.

If you are trying to produce a profile on demand for testing, make sure long task reporting is
actually enabled in your RUM configuration. `longTaskThresholdMs` defaults to `0`, which disables
JavaScript long task reporting entirely:

```js
{
    rumConfiguration: {
        // Report JS tasks blocking the thread for 200ms or more.
        longTaskThresholdMs: 200
    }
}
```

Note that `nativeLongTaskThresholdMs` is a separate setting and will not help here: in React
Native your JavaScript runs off the main thread, so blocking it does not trip native main-thread
long task detection.

On Android, trace capture is additionally rate limited by the operating system. Profiling is built
on `android.os.ProfilingManager` (Android 15+), whose service applies a cost-based rate limiter
that, in practice, allows only a small number of captures per app process. Requests it rejects are
reported through telemetry and produce no log output at all, so expect profiles to appear at a
noticeably lower rate than your sampling rate alone would suggest.

## Access your profiles

Your profiles appear in the [Datadog Profiler][2], scoped to the `service` and `env` you configured when initializing the React Native SDK.

[1]: https://www.npmjs.com/package/@datadog/mobile-react-native
[2]: https://app.datadoghq.com/profiling
