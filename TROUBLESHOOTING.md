# TROUBLESHOOTING

## How to test before shipping?

1. `cd path/to/dd-sdk-reactnative && npm pack`
    * this creates a tarball from your local & unpublished package
2. `cd {some other folder} && react-native init SomeAppName && cd SomeAppName`
3. `npm install --save path/to/dd-sdk-reactnative/{tarball that npm pack created}`
    * this installs the unpublished version of `dd-sdk-reactnative` **from your local**
 
If for some reason `npm pack` doesn't work, you can do the workaround below after creating `SomeAppName`:

1. `npm install --save path/to/dd-sdk-reactnative`
2. `open node_modules` and remove symlink to `dd-sdk-reactnative`
3. copy the real `dd-sdk-reactnative` folder to `node_modules`
    * `react-native` doesn't support symlinks and JS engine gives `unresolved module: dd-sdk-reactnative` when you import it in your JS code

Now you can proceed to `/ios`:

1. `cd ../ios && open SomeAppName.xcworkspace`
2. make the changes below in `Podfile` and run `pod install`

```
platform :ios, '11.0'
use_frameworks!

# and disable Flipper related lines
```
**NOTE:** You do **NOT** need to add `dd-sdk-reactnative` here manually, `pod install` should find and install it automatically

Now you can go back to your `App.js/tsx` and use `dd-sdk-reactnative` from there
Example code:
```
import { DdSdk, DdSdkConfiguration } from 'dd-sdk-reactnative';

const App: () => React$Node = () => {
  let config = new DdSdkConfiguration("token", "env", "appId");
  DdSdk.initialize(config);
  ...
```

Then your project should work without problems ✅ 

If it doesn't, you should fix it before shipping ❌

## What are some other potential problems?

### `Undefined symbol _RCTModule`

I had this issue when I run the project from Xcode. It might be related to this change in [`react-native v0.63 changelog`](https://github.com/facebook/react-native/commit/6e08f84719c47985e80123c72686d7a1c89b72ed)

I can't reproduce the issue anymore but if it happens again, you can try to import the module instead of header file

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