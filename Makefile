RELEASE_TEST_APP_NAME = ReleaseTestApp

define ReleaseTestAppPodfile
require_relative '../node_modules/react-native/scripts/react_native_pods'\n
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'\n
platform :ios, '11.0'\n
use_frameworks!\n
target '${RELEASE_TEST_APP_NAME}' do\n
  config = use_native_modules!\n
  use_react_native!(:path => config["reactNativePath"])\n
  target '${RELEASE_TEST_APP_NAME}Tests' do\n
    inherit! :complete\n
  end\n
end\n
target '${RELEASE_TEST_APP_NAME}-tvOS' do\n
  target '${RELEASE_TEST_APP_NAME}-tvOSTests' do\n
    inherit! :search_paths\n
  end\n
end\n
endef
export ReleaseTestAppPodfile

define SDKUsageJavascript
import { DdSdkConfiguration, DdSdk, DdLogs, DdRum } from 'dd-sdk-reactnative';\n
const config = new DdSdkConfiguration("token", "env", "appID");\n
DdSdk.initialize(config).then(() => {\n
  console.log("DD running...");\n
  DdRum.startView('first', 'App', new Date().getTime(), {});\n
  DdLogs.info('This is a log sent from react-native', {\n
    foo: 42,\n
    bar: 'xyz',\n
  });\n
});\n
endef
export SDKUsageJavascript

test-for-release:
	npm install && npm pack
	npx react-native init ${RELEASE_TEST_APP_NAME}
	# dd-sdk-reactnative-0.1.0.tgz is hardcoded for now, ideally we should read the version from package.json
	cd ${RELEASE_TEST_APP_NAME} && npm install --save ../dd-sdk-reactnative-0.1.0.tgz
	# write to Podfile
	echo $$ReleaseTestAppPodfile > ${RELEASE_TEST_APP_NAME}/ios/Podfile
	# append to App.js
	echo $$SDKUsageJavascript >> ${RELEASE_TEST_APP_NAME}/App.js
	cd ${RELEASE_TEST_APP_NAME}/ios && pod install
	cd ${RELEASE_TEST_APP_NAME} && npx react-native run-ios