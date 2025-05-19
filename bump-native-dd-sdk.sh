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
)

podspec_files=(
  "packages/core/DatadogSDKReactNative.podspec"
  "packages/react-native-session-replay/DatadogSDKReactNativeSessionReplay.podspec"
  "packages/react-native-webview/DatadogSDKReactNativeWebView.podspec"
)

ios_pattern="('Datadog[^']+', '~> )[0-9.]+'"
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

for file in "${files[@]}"; do
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
