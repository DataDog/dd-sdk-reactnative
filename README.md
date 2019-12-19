
# dd-sdk-reactnative

## Getting started

### Install node and watchman

`$ brew install node`
`$ brew install watchman`

### Public npm package mode installation

* Install the npm package:
`$ npm install dd-sdk-reactnative --save`

* Link the npm package as a dependency to your app:
`$ npx react-native link dd-sdk-reactnative`

### Local npm package mode installation
* Add the dependency into your package.json:
`{
  .........
  devDependencies": {
    ..........  
    "dd-sdk-reactnative": "file:../"
  }
}`
* Install the module: `$ npm install`
* Link the module: `$ npx react-native link`


### Local mode installation

#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `dd-sdk-reactnative` and add `RNDdReactNativeSdk.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libRNDdReactNativeSdk.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`Cmd+R`)<

#### Android

1. Open up `android/app/src/main/java/[...]/MainActivity.java`
  - Add `import com.datadog.reactnative.sdk.DatadogSdkPackage;` to the imports at the top of the file
  - Add `new DatadogSdkPackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
  	```
  	include ':dd-sdk-reactnative'
  	project(':dd-sdk-reactnative').projectDir = new File(rootProject.projectDir, 	'../node_modules/dd-sdk-reactnative/android')
  	```
3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:
  	```
      implementation project(':dd-sdk-reactnative')
  	```

## Run Sample App

```console
   $ npx react-native run-android
   $ npx react-native run-ios
```


## Usage
```javascript
import RNDatadogSdk from 'dd-sdk-reactnative';

// TODO: What to do with the module?
RNDatadogSdk;
```
