# Benchmark runner app for Datadog React Native SDK

## Build and run

1. From the root benchmark folder, run `yarn install`.
2. From the iOS folder, run `pod install`.
3. From the root folder, run `yarn ios` or `yarn android`.

## Enable new architcture

### iOS

```
RCT_NEW_ARCH_ENABLED=1 pod install
```

### Android

Set `newArchEnabled=true` in `benchmarks/android/gradle.properties`.

## ENV config

The .env config file contains configuration for the Datadog API, as well as a test scenario that you can launch when the app boots up. If it doesn't contain a test scenario, the app waits for a deeplink to trigger a test scenario instead.

    DD_CLIENT_TOKEN="CLIENT_TOKEN"
    DD_API_KEY="API_KEY"
    DD_APP_ID="APP_ID"
    DD_SITE="SITE"
    DD_ENV="ENV"
    BENCH_SCENARIO=""
    BENCH_RUN_TYPE=""

## Changing ENV settings

### Debug
```
     $ ENVFILE=.env.alternate yarn ios
```
or:

```
     $ ENVFILE=.env.alternate yarn android
```

### Release
On Android:
``` 
    $ ENVFILE=.env.alternate ./gradlew assembleRelease
```
    
On iOS:
``` 
    xcodebuild -scheme alternate
``` 

## Set test scenarios using deeplinks

You can trigger test scenarios by running a deeplink with a specific set of parameters to the benchmark app.

## Run a test scenario

Launch a specific test scenario with a particular configuration:
- **Method**: `start`
- **Parameters**:
    - **scenario**: name of the test as defined on Scenario enum in `types/testConfig.ts`
    - **runType**: `instrumented|baseline|profiling`

### iOS

```
xcrun simctl openurl booted "benchmark://start?scenario=navigation&runType=instrumented"
```

### Android

```
adb shell am start -W -a android.intent.action.VIEW -d 'benchmark://start?scenario=navigation\&runType=instrumented' com.benchmarkrunner
```

## Stop a test scenario

Stops the scenario currently running.

- **Method**: `stop`

### iOS

```
xcrun simctl openurl booted "benchmark://stop"
```

### Android

```
adb shell am start -W -a android.intent.action.VIEW -d 'benchmark://stop' com.benchmarkrunner
```