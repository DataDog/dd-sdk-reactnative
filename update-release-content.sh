#!/bin/sh

version=$(cat ./packages/core/package.json | jq -r '.version')

# prepare packages
yarn
yarn workspace @datadog/mobile-react-native pack
yarn workspace @datadog/mobile-react-navigation pack
yarn workspace @datadog/mobile-react-native-navigation pack

./check-release-content.sh -p packages/core/datadog-mobile-react-native-v$version.tgz > packages/core/release-content.txt
./check-release-content.sh -p packages/react-navigation/datadog-mobile-react-navigation-v$version.tgz > packages/react-navigation/release-content.txt
./check-release-content.sh -p packages/react-native-navigation/datadog-mobile-react-native-navigation-v$version.tgz > packages/react-native-navigation/release-content.txt

