# Datadog React Native SDK for Vega OS

This private package provides the native bridge and HTTP transport for Vega OS.
The bridge uses the Datadog C++ SDK and Kepler TurboModules. Native upload
requests are forwarded through JavaScript `fetch`; responses are returned to the
native upload thread. SDK initialization and feature APIs will be added
separately.

`startHttpProxy()` resolves to a cleanup function. Await it before starting the
native SDK so the JavaScript listener and native emitter are ready for uploads.
Native modules are resolved on use, keeping package imports safe on other
platforms.

Run the transport tests with:

```sh
yarn workspace @datadog/mobile-react-native-vega test --runInBand --watchman=false
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
