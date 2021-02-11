# dd-sdk-reactnative

> A client-side React Native module to interact with Datadog.

This repository provides a Native Module allowing you to track your React Native project as a Datadog RUM application. 

## Installation

```sh
npm install dd-sdk-reactnative
```

## Usage

```js
import { DdSdk, DdSdkConfiguration, DdLogs, DdRum } from 'dd-sdk-reactnative';

// Initialize the SDK
const config = new DdSdkConfiguration("<CLIENT_TOKEN>", "<ENVIRONMENT_NAME>", "<RUM_APPLICATION_ID>");
DdSdk.initialize(config);

// Send logs (use the debug, info, warn of error methods)
DdLogs.info("Lorem ipsum dolor sit amet…", 0, {});

// Track RUM Views manually
DdRum.startView('<view-key>', 'View Url', new Date().getTime(), {});
//…
DdRum.stopView('<view-key>', new Date().getTime(), { custom: 42});

// Track RUM Actions manually
DdRum.addAction('TAP', 'button name', new Date().getTime(), {});


// Track RUM Resource manually
DdRum.startResource('<res-key>', 'GET', 'http://www.example.com/api/v1/test', new Date().getTime(), {} );
//…
DdRum.stopResource('<res-key>', 200, 'xhr', new Date().getTime(), {});
```

## License

[Apache License, v2.0](LICENSE)

