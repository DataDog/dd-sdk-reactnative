## Overview

Enable React Native Crash Reporting and Error Tracking to get comprehensive crash reports and error trends with Real User Monitoring. With this feature, you can access:

-   Aggregated React Native crash dashboards and attributes
-   Symbolicated React Native (JavaScript and native iOS or Android) crash reports
-   Trend analysis with React Native Error Tracking

In order to symbolicate your stack traces, manually upload your mapping files into Datadog.

Your crash reports appear in [**Error Tracking**][1].

## Setup

If you have not set up the RUM React Native SDK yet, follow the [in-app setup instructions][2] or see the [React Native RUM setup documentation][3].

### Add Crash Reporting

Update your initialization snippet to enable native JavaScript crash reporting:

```javascript
const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true,
    true,
    true // enable javascript crash reporting
);
config.nativeCrashReportEnabled = true; // enable native crash reporting
```

## Symbolicate crash reports

In order to make your application's size smaller, its code is minified when it is built for release. To link errors to your actual code, you need to upload the following symbolication files:

-   JavaScript source map for your iOS JavaScript bundle
-   JavaScript source map for your Android JavaScript bundle
-   dSYMs for your iOS native code
-   Proguard mapping files if you have enabled code obfuscation for your Android native code

### Upload JavaScript source maps on iOS builds

You need to install `@datadog/datadog-ci` as a dev dependency to your project:

```bash
yarn add -D @datadog/datadog-ci
# or
npm install --save-dev @datadog/datadog-ci
```

#### Manually on each build (without Hermes)

To output a source map, you need to edit the XCode build phase "Bundle React Native Code and Images".

1. Open the `ios/YourAppName.xcworkspace` file in XCode.
2. In the left panel, select the "File" icon and click on your project.
3. In the central panel, select "Build Phases" from the top bar.

Change the script by adding this after the `set -e` line:

```bash
set -e
export SOURCEMAP_FILE=./build/main.jsbundle.map # <- add this line to output sourcemaps
# leave the rest of the script unchanged
```

Moving forward, you can find the source maps for your bundle on every iOS build.

To find the path to your bundle file from XCode, display the Report Navigator on XCode and filter by `BUNDLE_FILE` for its location.

The usual location is `~/Library/Developer/Xcode/DerivedData/YourAppName-verylonghash/Build/Intermediates.noindex/ArchiveIntermediates/YourAppName/BuildProductsPath/Release-iphoneos/main.jsbundle`, where `YourAppName` is the name of your app, and `verylonghash` is a 28 letter hash.

To upload the source maps, run this from your React Native project:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the version of your app in XCode
export BUILD=100 # replace by the build of your app in XCode
export BUNDLE_PATH= # fill with your bundle path

yarn datadog-ci react-native upload --platform ios --service $SERVICE --bundle $BUNDLE_PATH --sourcemap ./build/main.jsbundle.map --release-version $VERSION --build-version $BUILD
```

#### Manually on each build (with Hermes)

There is currently a bug in React Native that generates an incorrect source map when using Hermes.

To resolve this, you need to add more lines **at the very end** of the build phase to generate a correct source map file.

Edit your build phase like so:

```bash
set -e
export SOURCEMAP_FILE=./build/main.jsbundle.map # <- add this line to output sourcemaps

# keep the rest of the script unchanged

# add these lines to compose the packager and compiler sourcemaps into one file
REACT_NATIVE_DIR=../node_modules/react-native
source "$REACT_NATIVE_DIR/scripts/find-node.sh"
source "$REACT_NATIVE_DIR/scripts/node-binary.sh"
"$NODE_BINARY" "$REACT_NATIVE_DIR/scripts/compose-source-maps.js" "$CONFIGURATION_BUILD_DIR/main.jsbundle.map" "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle.map" -o "../$SOURCEMAP_FILE"
```

To upload the source map, run this from your React Native project root:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the version of your app in XCode
export BUILD=100 # replace by the build of your app in XCode
export BUNDLE_PATH= # fill with your bundle path

yarn datadog-ci react-native upload --platform ios --service $SERVICE --bundle $BUNDLE_PATH --sourcemap ./build/main.jsbundle.map --release-version $VERSION --build-version $BUILD
```


### Upload JavaScript source maps on Android builds

#### Manually on each build

On Android, the bundle file is located at `android/app/build/generated/assets/react/release/index.android.bundle` and the source map file is located at `android/app/build/generated/sourcemaps/react/release/index.android.bundle.map`.

After running your build, upload your source map by running this from your React Native project root:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the versionName from android/app/build.gradle
export BUILD=100 # replace by the versionCode from android/app/build.gradle
export BUNDLE_PATH=android/app/build/generated/assets/react/release/index.android.bundle
export SOURCEMAP_PATH=android/app/build/generated/sourcemaps/react/release/index.android.bundle.map

yarn datadog-ci react-native upload --platform android --service $SERVICE --bundle $BUNDLE_PATH --sourcemap $SOURCEMAP_PATH --release-version $VERSION --build-version $BUILD
```


### Upload iOS dSYM files

#### Manually on each build

For more information, see the [iOS Crash Reporting and Error Tracking documentation][4].


### Upload Android Proguard mapping files

First, ensure that Proguard minification is enabled on your project. By default, this is not enabled on React Native projects.

For more information, see [the React Native Proguard documentation][5].

If you are still unsure, you can see if running `(cd android && ./gradlew tasks --all) | grep minifyReleaseWithR8` returns anything. If so, minification is enabled.

#### Manually on each build

In your `android/app/build.gradle` file, add the plugin and configure it **at the very top of the file**:

```groovy
plugins {
    id("com.datadoghq.dd-sdk-android-gradle-plugin") version "1.4.0"
}

datadog {
    site = "US"
    checkProjectDependencies = "none" // this is needed in any case for React Native projects
}
```

For more information, see the [Android Crash Reporting and Error Tracking documentation][6].

To run the plugin after a build, export your API key as `DD_API_KEY` and run `(cd android && ./gradlew app:uploadMappingRelease)`.

#### Automate the upload on each build

Install the plugin like in the previous step.

Find the loop on `applicationVariants` in the `android/app/build.gradle` file. It should look like `applicationVariants.all { variant ->`. 

Inside the loop, add the following snippet:

```groovy
        if (project.tasks.findByName("minify${variant.name.capitalize()}WithR8")) {
            tasks["minify${variant.name.capitalize()}WithR8"].finalizedBy { tasks["uploadMapping${variant.name.capitalize()}"] }
        }
```

### Verify crash reports

To verify your React Native Crash Reporting and Error Tracking configuration, you can install a package like the [`react-native-crash-tester`][7] to crash your app from the native or JavaScript side.

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/error-tracking
[2]: https://app.datadoghq.com/rum/application/create
[3]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[4]: https://docs.datadoghq.com/real_user_monitoring/ios/crash_reporting/?tabs=cocoapods#symbolicate-crash-reports
[5]: https://reactnative.dev/docs/signed-apk-android#enabling-proguard-to-reduce-the-size-of-the-apk-optional
[6]: https://github.com/datadog/dd-sdk-android-gradle-plugin
[7]: https://github.com/cwhenderson20/react-native-crash-tester
