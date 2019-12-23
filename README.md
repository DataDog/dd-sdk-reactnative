
# dd-sdk-reactnative

## Getting started

Install watchman `$ brew install watchman`.
If you want to use **yarn**: `$ brew install yarn` or **npm**: `$ brew install npm`

### Publish the package

* Register and login to npm
* Install the npm package:
`$ npm publish`

## Run Sample App for Android

* Go to the SdkSample directory:
`$ cd SdkSample`

* Download dependencies: `$ yarn`  or `$ npm install`

* Run project

```console   
  npx react-native run-android
```

## In case there is a problem with caching while using yarn:

```console
  rm -rf node-modules/
  yarn cache clean
  yarn
```
## In case there is a problem with caching while using npm:

```console
  rm -rf node-modules/
  npm cache clean
  npm install
```

## Usage
```javascript
import RNDatadogSdk from 'dd-sdk-reactnative';

RNDatadogSdk.initialize(token);
RNDatadogSdk.initializeWithEndpoint(token, endpointUrl);
```

## Unit Testing

For unit testing we use [Jest](https://jestjs.io/en/) and [Babel](https://babeljs.io/docs/en/).
For executing the unit tests: `$ npm test`