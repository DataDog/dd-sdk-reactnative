# Datadog React Native SDK for Vega OS

This private package provides the native bridge and HTTP transport for Vega OS.
The bridge uses the Datadog C++ SDK and Kepler TurboModules. Native upload
requests are forwarded through JavaScript `fetch`; responses are returned to the
native upload thread. SDK initialization and feature APIs will be added
separately.

`startHttpProxy()` resolves to a cleanup function. Await it before starting the
native SDK so the JavaScript listener and native emitter are ready for uploads.
Starting again stops the previous session. Cleanup removes the listener, aborts
active fetches where supported, and disarms native uploads, waking any pending
requests. Uploads use a 25-second JavaScript deadline alongside native's
30-second response wait. Timeouts and cancellation keep batches eligible for
retry. SDK uploads bypass automatic Fetch and XHR resource tracking without
adding headers or excluding app requests to the same URL.

Native modules are resolved on use, keeping package imports safe on other
platforms. This package follows the shared repository version with a `-beta`
suffix while remaining private and excluded from publishing.

Run the transport tests with:

```sh
yarn test --runTestsByPath packages/react-native-vega/__tests__/*.test.ts --runInBand --watchman=false
yarn workspace @datadog/mobile-react-native-vega test:native
```

Regenerate the native module bindings after changing the specification:

```sh
yarn workspace @datadog/mobile-react-native-vega codegen
```

Build the native module with the Vega SDK installed:

```sh
cd packages/react-native-vega
vega build -b Release
```
