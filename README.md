# dd-sdk-reactnative

A client-side React Native module to interact with Datadog

## Installation

```sh
npm install dd-sdk-reactnative
```

## Usage

```js
import { Datadog, DatadogConfiguration, DdLogs, DdRum } from 'dd-sdk-reactnative';

// Initialize the SDK
let config = new DatadogConfiguration("<CLIENT_TOKEN>", "<ENVIRONMENT_NAME>", "<RUM_APPLICATION_ID>");
Datadog.initialize(config);

// Send logs (use the debug, info, warn of error methods)
DdLogs.info("Lorem ipsum dolor sit amet…", 0, {});
```

## License

[Apache License, v2.0](LICENSE)
