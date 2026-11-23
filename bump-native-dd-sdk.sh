#!/bin/bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <ios|android> <new_version>"
  exit 1
fi

sdk="$1"
new_version="$2"

build_gradle_files=(
  "packages/core/android/build.gradle"
  "packages/react-native-session-replay/android/build.gradle"
  "packages/react-native-webview/android/build.gradle"
  "packages/internal-testing-tools/android/build.gradle"
  "benchmarks/android/app/build.gradle"
)

podspec_files=(
  "packages/core/DatadogSDKReactNative.podspec"
  "packages/react-native-session-replay/DatadogSDKReactNativeSessionReplay.podspec"
  "packages/react-native-webview/DatadogSDKReactNativeWebView.podspec"
  "packages/internal-testing-tools/DatadogInternalTesting.podspec"
)

package_swift_files=(
  "packages/core/ios/Package.swift"
  "packages/react-native-session-replay/Package.swift"
  "packages/react-native-webview/ios/Package.swift"
  "packages/internal-testing-tools/ios/Package.swift"
)

ios_pattern="(datadog_ios_version = ')[0-9.]+'"
package_swift_pattern='(let datadogIOSVersion: Version = ")[0-9.]+"'
android_pattern='(com\.datadoghq:dd-sdk-android-[^:"]+):[0-9.]+'

if [[ "$sdk" == "ios" ]]; then
  pattern="$ios_pattern"
  files=("${podspec_files[@]}")
  sed_pattern="s/${pattern}/\1${new_version}'/"
elif [[ "$sdk" == "android" ]]; then
  pattern="$android_pattern"
  files=("${build_gradle_files[@]}")
  sed_pattern="s/${pattern}/\1:${new_version}/"
else
  echo "Unknown platform '$sdk'"
  echo "Usage: $0 <ios|android> <new_version>"
  exit 1
fi

update_files() {
  local pattern="$1"
  local sed_pattern="$2"
  shift 2

  for file in "$@"; do
    if [[ ! -f "$file" ]]; then
      echo "❌ File not found: $file"
      continue
    fi

    echo -e "\nUpdating: $file"

    updated=false
    tmp_file="${file}.tmp"

    while IFS= read -r line; do
      if [[ "$line" =~ $pattern ]]; then
        old_line="$line"
        new_line=$(echo "$line" | sed -E "$sed_pattern")
        if [[ "$new_line" != "$old_line" ]]; then
          echo "✅ $new_line"
          updated=true
          echo "$new_line" >> "$tmp_file"
        else
          echo "$line" >> "$tmp_file"
        fi
      else
        echo "$line" >> "$tmp_file"
      fi
    done < "$file"

    if $updated; then
      mv "$tmp_file" "$file"
    else
      echo "ℹ️  No updates needed in $file"
      rm "$tmp_file"
    fi
  done
}

update_files "$pattern" "$sed_pattern" "${files[@]}"

if [[ "$sdk" == "ios" ]]; then
  update_files "$package_swift_pattern" "s/${package_swift_pattern}/\\1${new_version}\"/" "${package_swift_files[@]}"
fi
