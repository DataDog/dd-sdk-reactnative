# RUM React Native OpenTelemetry Support

The React Native SDK for Datadog supports distributed traces through header generation.

## Datadog header generation

When configuring the Datadog SDK, you can specify the types of tracing headers you want Datadog to generate. For example, if you want to send `b3` headers to `example.com` and `tracecontext` headers for `myapi.names`, you can do so with the following code:

```javascript
import { PropagatorTypes } from '@datadog/mobile-react-native';

const config = new DatadogProviderConfiguration(/* ... */); // If you use <DatadogProvider configuration={config}>
const config = new DdSdkReactNativeConfiguration(/* ... */); // If you use DdSdkReactNative.initiatize(config)

config.firstPartyHosts = [
    { match: 'myapi.names', propagatorTypes: [PropagatorTypes.TRACECONTEXT] },
    { match: 'example.com', propagatorTypes: [PropagatorTypes.B3] }
];
```

You can specify multiple propagator types per match, for example:

```javascript
config.firstPartyHosts = [
    {
        match: 'example.com',
        propagatorTypes: [PropagatorTypes.B3, PropagatorTypes.B3MULTI]
    }
];
```

Supported propagator types are:

-   `PropagatorTypes.B3` for [b3 single header][1]
-   `PropagatorTypes.B3MULTI` for [b3 multiple headers][2]
-   `PropagatorTypes.TRACECONTEXT` for [W3C header][3]
-   `PropagatorTypes.DATADOG` for Datadog tracing header

## Further reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://github.com/openzipkin/b3-propagation#single-headers
[2]: https://github.com/openzipkin/b3-propagation#multiple-headers
[3]: https://www.w3.org/TR/trace-context/#traceparent-header
