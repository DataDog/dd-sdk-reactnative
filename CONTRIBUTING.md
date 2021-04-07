# Contributing

First of all, thanks for contributing!

This document provides some basic guidelines for contributing to this repository.
To propose improvements, feel free to submit a PR or open an Issue.

## Setup your developer Environment

To get started with the project, run `yarn install` in the root directory to install the required dependencies for each package:

```sh
yarn install
```

### Native Module development

By default, the iOS and Android source files are automatically generated based on the [dd-mobile-bridge](https://github.com/DataDog/dd-mobile-bridge) repository. 

To edit the Objective-C files, open `example/ios/DdSdkReactNativeExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > dd-sdk-reactnative`.

To edit the Kotlin files, open `example/android` in Android studio and find the source files at `ddsdkreactnative` under `Android`.

### Command line tools

You can run the samples, linters and test using the following commands: 

```sh
# Run the Unit Tests
npm test

# Run the linter
npm run lint
```

Before you run tests locally, make sure you modify the local version of `node_modules/react-native-gesture-handler/jestSetup.js` to be:

```javascript
import { NativeModules as RNNativeModules } from "react-native";

RNNativeModules.RNGestureHandlerModule = RNNativeModules.RNGestureHandlerModule || {
  State: { BEGAN: "BEGAN", FAILED: "FAILED", ACTIVE: "ACTIVE", END: "END" },
  attachGestureHandler: jest.fn(),
  createGestureHandler: jest.fn(),
  dropGestureHandler: jest.fn(),
  updateGestureHandler: jest.fn(),

};
RNNativeModules.PlatformConstants = RNNativeModules.PlatformConstants || {
  forceTouchAvailable: false
};
``` 

### Example App

The `example` folder contains a sample React Native application used to develop and test the SDK.

To run it properly, you need to create a `example/src/ddCredentials.js` file with the following content:

```javascript

export const APPLICATION_ID = "<YOUR_APPLICATION_ID>";
export const CLIENT_TOKEN = "<YOUR_CLIENT_TOKEN>";
export const ENVIRONMENT = "<YOUR_ENVIRONMENT_NAME>";
```

You can then run the sample app using the following commands (from `example` folder):

```sh
# Run the Android sample
yarn android

# Run the ios sample
yarn ios
```


## How to test before shipping?

#### For iOS, run `make test-for-release`. If it doesn't work, read below

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
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from 'dd-sdk-reactnative';

const App: () => React$Node = () => {
  const config = new DdSdkReactNativeConfiguration(
    "<CLIENT_TOKEN>",
    "<ENVIRONMENT_NAME>",
    "<RUM_APPLICATION_ID>",
    true, // track User interactions (e.g.: Tap on buttons)
    true, // track XHR Resources
    true // track Errors
  )
  DdSdkReactNative.initialize(config);
  ...
```

Then your project should work without problems ✅ 

If it doesn't, you should fix it before shipping ❌

## Submitting Issues

Many great ideas for new features come from the community, and we'd be happy to
consider yours!

To share your request, you can open an [issue](https://github.com/DataDog/dd-sdk-reactnative/issues/new) 
with the details about what you'd like to see. At a minimum, please provide:

 - The goal of the new feature;
 - A description of how it might be used or behave;
 - Links to any important resources (e.g. Github repos, websites, screenshots,
     specifications, diagrams).

## Found a bug?

For any urgent matters (such as outages) or issues concerning the Datadog service
or UI, contact our support team via https://docs.datadoghq.com/help/ for direct,
faster assistance.

You may submit bug reports concerning the Datadog SDK for Android by 
[opening a Github issue](https://github.com/DataDog/dd-sdk-reactnative/issues/new).
At a minimum, please provide:

 - A description of the problem;
 - Steps to reproduce;
 - Expected behavior;
 - Actual behavior;
 - Errors (with stack traces) or warnings received;
 - Any details you can share about your configuration including:
    - Android API level;
    - Datadog SDK version;
    - Versions of any other relevant dependencies (OkHttp, …);
    - Your proguard configuration;
    - The list of Gradle plugins applied to your project.

If at all possible, also provide:

 - Logs (from the tracer/application/agent) or other diagnostics;
 - Screenshots, links, or other visual aids that are publicly accessible;
 - Code sample or test that reproduces the problem;
 - An explanation of what causes the bug and/or how it can be fixed.

Reports that include rich detail are better, and ones with code that reproduce
the bug are best.

## Have a patch?

We welcome code contributions to the library, which you can 
[submit as a pull request](https://github.com/DataDog/dd-sdk-reactnative/pull/new/master).
Before you submit a PR, make sure that you first create an Issue to explain the
bug or the feature your patch covers, and make sure another Issue or PR doesn't
already exist.

To create a pull request:

1. **Fork the repository** from https://github.com/DataDog/dd-sdk-reactnative ;
2. **Make any changes** for your patch;
3. **Write tests** that demonstrate how the feature works or how the bug is fixed;
4. **Update any documentation** such as `docs/GettingStarted.md`, especially for
    new features;
5. **Submit the pull request** from your fork back to this 
    [repository](https://github.com/DataDog/dd-sdk-reactnative) .


The pull request will be run through our CI pipeline, and a project member will
review the changes with you. At a minimum, to be accepted and merged, pull
requests must:

 - Have a stated goal and detailed description of the changes made;
 - Include thorough test coverage and documentation, where applicable;
 - Pass all tests and code quality checks (linting/coverage/benchmarks) on CI;
 - Receive at least one approval from a project member with push permissions.

Make sure that your code is clean and readable, that your commits are small and
atomic, with a proper commit message. 