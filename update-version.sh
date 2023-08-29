#!/bin/sh

set -e

# Change version
yarn run lerna version $1 --ignore-changes --no-git-tag-version --no-push
yarn prepare

# prepare packages
yarn
yarn workspace @datadog/mobile-react-native pack
yarn workspace @datadog/mobile-react-navigation pack
yarn workspace @datadog/mobile-react-native-navigation pack

./check-release-content.sh -p packages/core/package.tgz > packages/core/release-content.txt
./check-release-content.sh -p packages/react-navigation/package.tgz > packages/react-navigation/release-content.txt
./check-release-content.sh -p packages/react-native-navigation/package.tgz > packages/react-native-navigation/release-content.txt


# Update example repo
(cd example &&
yarn
(cd ios && pod install --repo-update)
)

(cd example-new-architecture &&
yarn
(cd ios && RCT_NEW_ARCH_ENABLED=1 pod install --repo-update)
)

git add .
git commit -m "Bump to version $1"
