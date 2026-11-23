# Swift Package Manager example app

This app checks that the SDK works in an app that uses React Native's Swift Package Manager
integration (`npx react-native spm`) instead of CocoaPods. It is iOS only.

The SDK supports this integration on React Native 0.88 and later. React Native 0.87 has a preview
of it, which names packages differently, and the SDK does not support it.

It links four packages from this repository:

- `@datadog/mobile-react-native` (`packages/core`)
- `@datadog/mobile-react-native-session-replay`
- `@datadog/mobile-react-native-webview`
- `@datadog/react-native-internal-testing-tools`

At launch, the app does these steps:

1. It initializes the SDK and Session Replay.
2. It sends a RUM view, an action, a log and a span.
3. It reads back the events that the native SDK recorded, through the internal testing tools.

The results are shown on screen and logged with the `DD_SPM_TEST` prefix.

## Run the app

1. Install the dependencies from the repository root:

   ```sh
   yarn install
   ```

2. Create `example-spm/ddCredentials.js`. This file is ignored by git.

   ```js
   export const CLIENT_TOKEN = '<client token>';
   export const ENVIRONMENT = '<environment>';
   export const APPLICATION_ID = '<RUM application ID>';
   ```

3. Start Metro:

   ```sh
   cd example-spm
   yarn start
   ```

4. Open `ios/DdSdkReactNativeSpmExample.xcodeproj` in Xcode and run the
   `DdSdkReactNativeSpmExample` scheme. You can also run `yarn ios`.

There is no `pod install` step. Xcode resolves the packages when it opens the project, and the
`Sync SPM Autolinking` build phase regenerates the autolinking package on each build.

## How the app was set up

This is what a customer does to move a React Native app from CocoaPods to Swift Package Manager:

1. Create the app with the React Native 0.88 template.
2. Generate a `Package.swift` for each native dependency that does not ship one:

   ```sh
   npx react-native spm scaffold
   ```

3. Convert the Xcode project:

   ```sh
   npx react-native spm add --deintegrate
   ```

   This command runs `pod deintegrate`, removes React Native from the Podfile, and adds the
   Swift packages and build phases to the Xcode project. The files that it adds to the project
   are recorded in `ios/DdSdkReactNativeSpmExample.xcodeproj/.spm-injected.json`. To undo it, run
   `npx react-native spm deinit`.

The Datadog packages need no scaffolding, because each one ships its own `Package.swift`.

### Files to keep

- `ios/Podfile` is a stripped Podfile that `spm add --deintegrate` leaves behind. Do not run
  `pod install` with it. Do not delete it: the React Native CLI finds the iOS project through it,
  and autolinking fails without it.
- `ios/ReactNativeSPM/` holds the build settings and the build phase scripts that `spm add`
  generates.

## Initialize the SDK from native code

To initialize the SDK before React Native starts, call it from the app delegate. In a Swift app
delegate, use the Swift API of the `DatadogSDKReactNative` module:

```swift
import DatadogSDKReactNative

// In application(_:didFinishLaunchingWithOptions:)
DdSdkNativeInitialization().initializeFromNative()
```

When the SDK is installed with CocoaPods, `DdSdkNativeInitialization` is in the same module.
`DdSdk.initFromNative()`, which the Objective-C setup uses, is in the `DatadogSDKReactNativeBridge`
module when the SDK is installed with Swift Package Manager.

## react-native-webview

`react-native-webview` does not ship a `Package.swift`. Its manifest comes from
`npx react-native spm scaffold`. A scaffolded manifest is written into `node_modules`, so it is
lost on the next install. Customers keep it with `patch-package`. This repository keeps it as a
Yarn patch:

- The patch is `.yarn/patches/react-native-webview-npm-14.0.1-5188b52144.patch`.
- `react-native-webview` in `package.json` refers to the patch, so the patch applies only to
  this app.

The patch also adds the folly defines that React Native's CocoaPods setup sets
(`FOLLY_NO_CONFIG`, `FOLLY_MOBILE`, `FOLLY_USE_LIBCPP` and `FOLLY_CFG_NO_COROUTINES`). Without
them, `react-native-webview` does not compile, because the scaffolder does not add them.

The app uses `react-native-webview` 14. Starting with version 16, `react-native-webview` no
longer has `RNCWebViewManager`, which `@datadog/mobile-react-native-webview` extends.

To regenerate the patch:

1. Remove the patch from `package.json`.
2. Run `yarn install` and `npx react-native spm scaffold`.
3. Add the folly defines to `node_modules/react-native-webview/Package.swift`.
4. Run `yarn patch react-native-webview@npm:14.0.1`.
5. Copy the changed files into the directory that the command prints.
6. Run `yarn patch-commit -s <directory>`.

`yarn patch-commit` adds `resolutions` entries to the root `package.json` that apply the patch to
every app in the repository. Remove those entries, and refer to the patch from this app's
`package.json` only.
