#!/bin/sh

set -e

# Change version
yarn run lerna version $1 --ignore-changes --no-git-tag-version --no-push

# prepare packages
yarn
yarn workspace @datadog/mobile-react-native pack
yarn workspace @datadog/mobile-react-navigation pack
yarn workspace @datadog/mobile-react-native-navigation pack

./check-release-content.sh -p packages/core/datadog-mobile-react-native-v$1.tgz > packages/core/release-content.txt
./check-release-content.sh -p packages/react-navigation/datadog-mobile-react-navigation-v$1.tgz > packages/react-navigation/release-content.txt
./check-release-content.sh -p packages/react-native-navigation/datadog-mobile-react-native-navigation-v$1.tgz > packages/react-native-navigation/release-content.txt


# Update example repo
(cd example &&
yarn remove @datadog/mobile-react-native &&
yarn remove @datadog/mobile-react-navigation &&
yarn remove @datadog/mobile-react-native-navigation &&
yarn add file:../packages/core
yarn add file:../packages/react-native-navigation
yarn add file:../packages/react-navigation
(cd ios && pod install --repo-update)
)

(cd example-new-architecture &&
yarn remove @datadog/mobile-react-native &&
yarn add file:../packages/core
(cd ios && RCT_NEW_ARCH_ENABLED=1 pod install --repo-update)
)

git add .
git commit -m "Bump to version $1"
