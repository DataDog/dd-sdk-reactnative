#!/bin/sh

set -e

# Change version in native files
sed -i '' -e "s/\".*\"/\"$1\"/g" packages/core/ios/Sources/SdkVersion.swift
sed -i '' -e "s/\".*\"/\"$1\"/g" packages/core/android/src/main/kotlin/com/datadog/reactnative/SdkVersion.kt

# Change version
yarn run lerna version $1 --ignore-changes --no-git-tag-version --no-push
yarn prepare

# prepare packages
yarn
yarn workspace @datadog/mobile-react-native pack
yarn workspace @datadog/mobile-react-navigation pack
yarn workspace @datadog/mobile-react-native-navigation pack
yarn workspace @datadog/mobile-react-native-apollo-client pack
yarn workspace @datadog/mobile-react-native-babel-plugin pack
yarn workspace @datadog/mobile-react-native-session-replay pack
yarn workspace @datadog/mobile-react-native-webview pack
yarn workspace @datadog/react-native-internal-testing-tools pack

./check-release-content.sh -p packages/core/package.tgz > packages/core/release-content.txt
./check-release-content.sh -p packages/react-navigation/package.tgz > packages/react-navigation/release-content.txt
./check-release-content.sh -p packages/react-native-navigation/package.tgz > packages/react-native-navigation/release-content.txt
./check-release-content.sh -p packages/react-native-apollo-client/package.tgz > packages/react-native-apollo-client/release-content.txt
./check-release-content.sh -p packages/react-native-babel-plugin/package.tgz > packages/react-native-babel-plugin/release-content.txt
./check-release-content.sh -p packages/react-native-session-replay/package.tgz > packages/react-native-session-replay/release-content.txt
./check-release-content.sh -p packages/react-native-internal-testing-tools/package.tgz > packages/internal-testing-tools/release-content.txt


# Update example apps
(cd example &&
yarn
(cd ios && RCT_NEW_ARCH_ENABLED=0 pod install --repo-update)
)

(cd example-new-architecture &&
yarn
(cd ios && RCT_NEW_ARCH_ENABLED=1 pod install --repo-update)
)

# Update benchmark app
(cd benchmarks &&
yarn
(cd ios && pod install --repo-update)
)

# Update NATIVE_SDK_VERSIONS.md
./update-native-sdk-versions.sh

git add .
git commit -m "Bump to version $1"
