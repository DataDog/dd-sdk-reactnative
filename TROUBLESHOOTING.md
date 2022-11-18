# TROUBLESHOOTING

### No data is being sent to Datadog

See the [dedicated troubleshooting guide](./docs/troubleshooting.md).

### `Undefined symbols: Swift`

Original issue: https://github.com/DataDog/dd-sdk-reactnative/issues/41

If you have the following error message:
```
Undefined symbols for architecture x86_64:
  "static Foundation.JSONEncoder.OutputFormatting.withoutEscapingSlashes.getter : Foundation.JSONEncoder.OutputFormatting", referenced from:
      static (extension in Datadog):Foundation.JSONEncoder.default() -> Foundation.JSONEncoder in libDatadogSDK.a(JSONEncoder.o)
...
```

open Xcode and go to `Build Settings` of your project (_not your app target_) then make sure `Library Search Paths` is the following:
```
LIBRARY_SEARCH_PATHS = (
  "\"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)\"",
  "\"/usr/lib/swift\"",
  "\"$(inherited)\"",
);
```

### `Undefined symbol _RCTModule`

I had this issue when I run the project from Xcode. It might be related to this change in [`react-native v0.63 changelog`](https://github.com/facebook/react-native/commit/6e08f84719c47985e80123c72686d7a1c89b72ed)

We made the change below to fix it:

```
// DdSdk.m
// instead of
#import <React/RCTBridgeModule.h>
// maybe that:
@import React // or @import React-Core
```

### Infinite loop-like error messages

Sometimes, almost randomly, my RN project gives error messages non-stop.
CPU usage goes up to %+100 and you'll quickly notice a problem with your laptop fan goes crazy.

This is the issue: https://github.com/facebook/react-native/issues/28801

I tried some of the solutions, none worked. I solved the issue by creating a new RN project.
