## Overview

If you have not set up the SDK yet, follow the [in-app setup instructions][1] or refer to the [React Native RUM setup documentation][2].

## Manual instrumentation

If automatic instrumentation doesn't suit your needs, you can manually create RUM Events and Logs:

{{< code-block lang="javascript" filename="Initialization Snippet" collapsible="true" >}}
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs,
    ErrorSource,
    RumActionType,
    DdRum
} from '@datadog/mobile-react-native';

// Initialize the SDK
const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true, // track user interactions (such as a tap on buttons)
    true, // track XHR resources
    true // track errors
);
DdSdkReactNative.initialize(config);

// Send logs (use the debug, info, warn, or error methods)
DdLogs.debug('Lorem ipsum dolor sit amet…', {});
DdLogs.info('Lorem ipsum dolor sit amet…', {});
DdLogs.warn('Lorem ipsum dolor sit amet…', {});
DdLogs.error('Lorem ipsum dolor sit amet…', {});

// Track RUM Views manually
DdRum.startView('<view-key>', 'View Url', {}, Date.now());
//…
DdRum.stopView('<view-key>', { custom: 42 }, Date.now());

// Track RUM Actions manually
DdRum.addAction(RumActionType.TAP, 'button name', {}, Date.now());
// Or in case of continuous action
DdRum.startAction(RumActionType.TAP, 'button name', {}, Date.now());
// To stop action above
DdRum.stopAction({}, Date.now());

// Add custom timings
DdRum.addTiming('<timing-name>');

// Track RUM Errors manually
DdRum.addError('<message>', ErrorSource.SOURCE, '<stacktrace>', {}, Date.now());

// Track RUM Resource manually
DdRum.startResource(
    '<res-key>',
    'GET',
    'http://www.example.com/api/v1/test',
    {},
    Date.now()
);
//…
DdRum.stopResource('<res-key>', 200, 'xhr', (size = 1337), {}, Date.now());

// Send spans manually
const spanId = await DdTrace.startSpan('foo', { custom: 42 }, Date.now());
//...
DdTrace.finishSpan(spanId, { custom: 21 }, Date.now());
{{< /code-block >}}

## Resource timings

Resource tracking is able to provide the following timings:

-   `First Byte`: The time between the scheduled request and the first byte of the response. This includes time for the request preparation on the native level, network latency, and the time it took the server to prepare the response.
-   `Download`: The time it took to receive a response.

## Further reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://docs.datadoghq.com/real_user_monitoring/reactnative