# Benchmark runner app for Datadog React Native SDK

## Build and run

1. From the root benchmark folder, run `yarn install`.
2. From the iOS folder, run `pod install`.
3. From the root folder, run `yarn ios` or `yarn android`.

## ENV config

The `.env` config file contains a configuration for the Datadog API, as well as a test scenario that you can launch when the app boots up. If it doesn't contain a test scenario, the app waits for a deep link to trigger a test scenario instead.

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

## Set test scenarios using deep links

You can trigger test scenarios by running a deep link with a specific set of parameters to the benchmark app.

## Run a test scenario

Launch a specific test scenario with a particular configuration:

- **Method**: `start`
- **Parameters**:
  - **scenario**: name of the test as defined on the `Scenario` enum in `types/testConfig.ts`
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

## Cold start scenario (TTFD)

The `coldStart` scenario measures the impact of the SDK initialization on cold start, as the time to fully displayed (TTFD):

- **baseline**: the app renders its first screen without the Datadog SDK.
- **instrumented**: the app is wrapped in `DatadogProvider` and tracks views with React Navigation. It calls `DdRum.reportAppFullyDisplayed()` once the first screen is laid out and the SDK has finished initializing.

For both run types, the `BenchmarkVitals` native module measures the time from process start to the moment the app is fully displayed. It submits the value once, as the `rn.ios.benchmark.ttfd` / `rn.android.benchmark.ttfd` distribution metrics (in milliseconds), tagged with `run` and `scenario`. Because the measure is independent from the SDK, the two run types can be compared, and the TTFD reported by the SDK in RUM can be checked against it.

The measure starts at process start, and the app may already be running when a deep link is opened. So a `coldStart` deep link doesn't run the scenario: it **arms** it, and the scenario runs once, on the next launch of the app. Open the deep link, then restart the app:

### iOS

```
APP_ID="com.datadog.react.native.--PRODUCT-NAME-rfc1034identifier-" # simulator builds
xcrun simctl openurl booted "benchmark://start?scenario=coldStart&runType=instrumented"
xcrun simctl terminate booted "$APP_ID"
xcrun simctl launch --console booted "$APP_ID"
```

### Android

```
adb shell am start -W -a android.intent.action.VIEW -d 'benchmark://start?scenario=coldStart\&runType=instrumented' com.benchmarkrunner
adb shell am force-stop com.benchmarkrunner
adb shell am start -W -n com.benchmarkrunner/.MainActivity
```

In Synthetics, each sample is an `Open deep link` step followed by a `Restart application` step, and a test can repeat them to collect several samples per run.

On iOS, launches pre-warmed by the system are not reported, since their process start time is not related to the moment the app was opened.

## Adding a new scenario to benchmarks

### Define the new scenario

In `benchmarks/src/testSetup/types/testConfig.ts`, add a new entry to the `Scenario` enum:

```ts
export enum Scenario {
  Default = 'default',
  NavigationExample = 'navigation',
  (...)
  NewScenario = 'newScenario'
}
```

The string value (`'newScenario'`) is what must be passed using a deep link as the `scenario` parameter.

Alternatively, if you're using a `.env` file to set the scenario, add:

```env
BENCH_SCENARIO="newScenario"
```

### Create the scenario component

Create a new folder under `benchmarks/src/scenario/` named after your scenario (for example, `NewScenario`). Inside this folder, define your scenario’s main component and its props.

Create a `types.ts` file:

```ts
import type {TestConfig} from 'benchmarks/src/testSetup/types/testConfig';

export type NewScenarioProps = {
  testConfig?: TestConfig;
};
```

Then, define the main component:

```ts
import { NewScenarioProps } from "./types";

function NewScenario(props: NewScenarioProps): React.JSX.Element {
  (...)
}

export default NewScenario;
```

### Register the scenario in the app

In `benchmarks/src/App.tsx`, add a new case to the scenario switch using the enum identifier you just created:

```tsx
case Scenario.NewScenario:
  return <NewScenario testConfig={testConfig} />;
```

You can then trigger this scenario through either a deep link or by setting `BENCH_SCENARIO` in the `.env` file.

## Instrument a scenario

Depending on the scenario’s structure and flow, the Datadog SDK initialization may vary. Each scenario is responsible for managing its own initialization logic.

To simplify this, use the `instrument()` helper from `benchmarks/src/testSetup/testUtils`. It initializes the SDK with a default configuration.

Since your scenario component receives `testConfig` as a prop, you can use it to determine whether instrumentation should occur:

```ts
useEffect(() => {
  if (props.testConfig?.runType !== RunType.BASELINE) {
    instrument().then(() => {
      // Datadog is initialized
    });
  }
}, []);
```

## Using the Datadog Provider

If your scenario uses the `DatadogProvider`, you can retrieve the necessary configuration using `getDatadogProviderConfig()` from the same `testUtils` module:

```ts
return (
  <DatadogProvider
    config={getDatadogProviderConfig()}
    onInitialization={onDatadogInitialization}>
    ...
  </DatadogProvider>
);
```
