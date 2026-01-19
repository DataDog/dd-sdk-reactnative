# Migration Guide

This document outlines breaking changes and migration steps between major versions of the project.

## Migration from 2.x to 3.0

This section describes the main changes introduced in SDK `3.0` compared to `2.x`.

### Core SDK Initialization changes

The configuration object used to initialize the SDK has seen some changes in its structure.
Feature configuration is now split into feature-specific properties: rumConfiguration, logsConfiguration, traceConfiguration.

Then, RUM, Logs and Trace can be independently configured via their optional configuration objects that are each represented by a property inside the core configuration object.

**NOTE: clientToken, environment and trackingConsent are mandatory for the Core SDK initialization. 
ApplicationID is mandatory for RUM to work.**

For instance, to configure the SDK and enable RUM, Logs and Trace you'd do the following:

```
const config = new CoreConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
    rumConfiguration: {
        applicationId: APPLICATION_ID,
        trackInteractions: true,
        trackResources: true,
        trackFrustrations: true,
        sessionSampleRate: 100,
        telemetrySampleRate: 100
    }
    },
    logsConfiguration: {
        logEventMapper: (logEvent) => {
            logEvent.message = `[CUSTOM] ${logEvent.message}`;
            return logEvent;
        }
    },
    traceConfiguration: {}
);

...

await DdSdkReactNative.initialize(config);
```

Or if using the DatadogProvider wrapper:

```
const configuration = new DatadogProviderConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
        batchSize: BatchSize.SMALL,
        uploadFrequency: UploadFrequency.FREQUENT,
        batchProcessingLevel: BatchProcessingLevel.MEDIUM,
        additionalConfiguration: {
            customProperty: "sdk-example-app"
        },
        rumConfiguration: {
            applicationId: APPLICATION_ID,
            trackInteractions: true,
            trackResources: true,
            trackErrors: true,
            sessionSampleRate: 100,
            nativeCrashReportEnabled: true
        },
        logsConfiguration: {
            logEventMapper: (logEvent) => {
                logEvent.message = `[CUSTOM] ${logEvent.message}`;
                return logEvent;
            }
        },
        traceConfiguration: {}
    }
);

...

<DatadogProvider configuration={configuration} onInitialization={onDatadogInitialization}>
```

**NOTE: Unlike v2.x, which would always enable all feature modules when initializing the SDK, v3 won't initialize nor enable a feature module if there's no configuration for it.**

### Property renames and relocations

| Property | New Location | Changes |
| :--- | :--- | :--- |
| `sampleRate` | *Removed* | Deprecated property removed. |
| `sessionSamplingRate` | `RumConfiguration` | Moved and renamed to `sessionSampleRate` |
| `resourceTracingSamplingRate` | `RumConfiguration` | Moved and renamed to `resourceTraceSampleRate`. |
| `proxyConfig` | `CoreConfiguration` | Renamed to `proxyConfiguration`. |
| `serviceName` | `CoreConfiguration` | Renamed to `service`. |
| `customEndpoints` | *Split* | Split into `customEndpoint` within `RumConfiguration`, `LogsConfiguration`, and `TraceConfiguration` |
| *New Property* | `CoreConfiguration` | `attributeEncoders` added. |
| *New Property* | `RumConfiguration` | `trackMemoryWarnings` added. |
| `nativeCrashReportEnabled` | `RumConfiguration` | Moved. |
| `nativeViewTracking` | `RumConfiguration` | Moved. |
| `nativeInteractionTracking` | `RumConfiguration` | Moved. |
| `firstPartyHosts` | `RumConfiguration` | Moved. |
| `telemetrySampleRate` | `RumConfiguration` | Moved. |
| `nativeLongTaskThresholdMs` | `RumConfiguration` | Moved. |
| `longTaskThresholdMs` | `RumConfiguration` | Moved. |
| `vitalsUpdateFrequency` | `RumConfiguration` | Moved. |
| `trackFrustrations` | `RumConfiguration` | Moved. |
| `trackBackgroundEvents` | `RumConfiguration` | Moved. |
| `bundleLogsWithRum` | `LogsConfiguration` | Moved. |
| `bundleLogsWithTraces` | `LogsConfiguration` | Moved. |
| `trackNonFatalAnrs` | `RumConfiguration` | Moved. |
| `appHangThreshold` | `RumConfiguration` | Moved. |
| `initialResourceThreshold` | `RumConfiguration` | Moved. |
| `trackWatchdogTerminations` | `RumConfiguration` | Moved. |
| `actionNameAttribute` | `RumConfiguration` | Moved. |
| `logEventMapper` | `LogsConfiguration` | Moved. |
| `errorEventMapper` | `RumConfiguration` | Moved. |
| `resourceEventMapper` | `RumConfiguration` | Moved. |
| `actionEventMapper` | `RumConfiguration` | Moved. |`TraceConfiguration`. |
| `useAccessibilityLabel` | `RumConfiguration` | Moved. |
| `trackInteractions` | `RumConfiguration` | Moved. |
| `trackResources` | `RumConfiguration` | Moved. |
| `trackErrors` | `RumConfiguration` | Moved. |

### FileBasedConfiguration changes

FileBasedConfiguration now requires a path to a configuration JSON file instead of trying to find a default `datadog-configuration.json` at the app's root level like it did on v2.

### Changes to SessionReplay configuration
defaultPrivacyLevel has been removed in favor of granular options: imagePrivacyLevel, touchPrivacyLevel and textAndInputPrivacyLevel.

### Fatal Errors are no longer reported as logs

Fatal Errors are no longer automatically reported as Logs. Fatal crashes will still be captured, but are no longer duplicated in Logs by default.

### Context / Attribute encoding
Context / attributes encoding is now safe and deterministic
 All attributes passed to Datadog SDK APIs are automatically sanitized and encoded:
Unsupported values (functions, symbols, non-finite numbers, etc.) are dropped with a warning to prevent crashes and undefined behavior
Common types (Date, Error, Map) are properly serialized
Nested objects are flattened using dot notation (a.b.c = value) to match native SDK expectations
Root-level primitives and arrays are wrapped under a context key for schema consistency
Custom encoders can be registered via the attributeEncoders configuration option for domain-specific types

### Android mindSdkVersion bumped to 23
Android's minSdkVersion has been bumped to 23.

### Resource Traces sampling aligned with RUM Sessions
Resource traces are now consistently sampled based on the active RUM session.
You may notice changes in the percentage of reported resources.

### JS Refresh rate normalization changes
JS refresh rate is now normalized to a 0–60 FPS range.

### RUM Session sampling changes
v3 modifies the logic to determine whether a trace should be sampled or not, by using the RUM Session ID first, before using the Trace sampling if no session can be found.

Consistent trace sampling based on RUM Session ID allows RUM clients and the backend to come to a the same decision about sampling without relying on randomness for each trace.

### Removed APIs

| API | Status |
| :--- | :--- |
| setUser | Removed in favor of setUserInfo. To completely remove userInfo please use the newly added clearUserInfo |
| setAttributes| Removed in favor of addAttributes | 

### Attributes API
The attribute API has been expanded allowing for addition and removal of single or batches of attributes in bulk.This can be performed with the new granular APIs:  addAttributes, removeAttributes, addAttribute and removeAttribute.

### New APIs

#### ViewAttributes

RUM View-level attributes are now automatically propagated to all related child events, including resources, user actions, errors, and long tasks. This ensures consistent metadata across events, making it easier to filter and correlate data on Datadog dashboards.

To manage View level attributes more effectively, new APIs were added:

```
addViewAttribute = (key: string, value: unknown)
removeViewAttribute = (key: string)
addViewAttributes = (attributes: Attributes)
removeViewAttributes = (keys: string[])
```

#### AccountInfo
The AccountInfo API from the native Datadog SDKs has been exposed to React Native as well:

```
setAccountInfo = async (accountInfo: {
    id: string;
    name?: string;
    extraInfo?: Record<string, unknown>;
})

clearAccountInfo = async ()

addAccountExtraInfo = async (extraAccountInfo: Record<string, unknown>)
```

#### Feature Operations

```
startFeatureOperation(
    name: string,
    operationKey: string | null,
    attributes: object
): Promise<void> 

succeedFeatureOperation(
    name: string,
    operationKey: string | null,
    attributes: object
): Promise<void> 

failFeatureOperation(
    name: string,
    operationKey: string | null,
    reason: FeatureOperationFailure,
    attributes: object
): Promise<void>
```

### New Navigation Tracking Options

v3 modifies the automatic navigation tracking modules for React Navigation and React Native Navigation and exposes a new NavigationTrackingOptions parameter through the startTracking/startTrackingViews function.

This `options` object allows to customize the view tracking logic via 3 new optional predicate functions:

- ViewNamePredicate - a custom naming predicates that decide the display name of views tracked by RUM.
- ViewTrackingPredicate - a custom predicate that decides if a view needs to be tracked by RUM or not.
- ParamsTrackingPredicate - a custom predicate that decides which navigation parameters (if any) need to be tracked alongside the view on RUM.

All of these are optional, and when not set the default behavior will be used for each one of them. The default behaviours are as follows:

- ViewNamePredicate - directly forwards the view given name to RUM.
- ViewTrackingPredicate - tracks all views on RUM.
- ParamsTrackingPredicate - does not forward any parameters to RUM.
