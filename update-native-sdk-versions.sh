#!/bin/bash

declare ios_version=""
declare android_version=""
declare core_version=""

# RN SDK package.json
core_package_json="packages/core/package.json"

# iOS podspecs
podspec_files=(
    "packages/core/DatadogSDKReactNative.podspec"
    "packages/react-native-session-replay/DatadogSDKReactNativeSessionReplay.podspec"
    "packages/react-native-webview/DatadogSDKReactNativeWebView.podspec"
)

# Android build.gradle files
build_gradle_files=(
    "packages/core/android/build.gradle"
    "packages/react-native-session-replay/android/build.gradle"
)

# Get core package version
if [ -f "$core_package_json" ]; then
    core_version=$(grep '"version":' "$core_package_json" | cut -d'"' -f4)
else
    echo "Error: Core package.json not found at $core_package_json"
    exit 1
fi


# Get iOS SDK versions
for podspec in "${podspec_files[@]}"; do
    if [ -f "$podspec" ]; then
        # Look for lines containing both 'Datadog' and '~>' and extract the version number
        version=$(grep "Datadog.*~>" "$podspec" | sed 's/.*~> \([0-9.]*\).*/\1/' | head -n 1)
        
        if [ ! -z "$version" ]; then
            if [ -z "$ios_version" ]; then
                ios_version="$version"
            elif [ "$ios_version" != "$version" ]; then
                echo "Error: Found different iOS SDK versions: $ios_version and $version"
                echo "Please align the versions in the podspecs."
                exit 1
            fi
        fi
    else
        echo "Warning: File $podspec not found"
    fi
done

# Get Android SDK versions
for gradle in "${build_gradle_files[@]}"; do
    if [ -f "$gradle" ]; then
        # Look for lines containing 'com.datadoghq:dd-sdk-android' and extract the version after the last colon
        version=$(grep "com.datadoghq:dd-sdk-android" "$gradle" | sed 's/.*:\([0-9.]*\).*/\1/' | head -n 1)
        
        if [ ! -z "$version" ]; then
            if [ -z "$android_version" ]; then
                android_version="$version"
            elif [ "$android_version" != "$version" ]; then
                echo "Error: Found different Android SDK versions: $android_version and $version"
                echo "Please align the versions in the build.gradle files."
                exit 1
            fi
        fi

        android_version="$version"
    else
        echo "Warning: File $build_gradle not found"
    fi
done

echo "RN SDK version: $core_version"
echo "iOS SDK version: $ios_version"
echo "Android SDK version: $android_version"

# Check if NATIVE_SDK_VERSIONS.md exists, create it otherwise
if [ ! -f "NATIVE_SDK_VERSIONS.md" ]; then
    echo "| React Native | iOS Bridge / iOS SDK | Android Bridge / Android SDK |" > NATIVE_SDK_VERSIONS.md
    echo "|-------------|---------------------|----------------------------|" >> NATIVE_SDK_VERSIONS.md
    echo "Creating new NATIVE_SDK_VERSIONS.md file with header"
fi

# Add the new version triad to NATIVE_SDK_VERSIONS.md
if [ ! -z "$core_version" ] && [ ! -z "$ios_version" ] && [ ! -z "$android_version" ]; then
    new_row="| $core_version | $ios_version | $android_version |"
    
    first_version_row=$(sed -n '3p' NATIVE_SDK_VERSIONS.md)
    
    if [ "$first_version_row" = "$new_row" ]; then
        echo "Version already exists in NATIVE_SDK_VERSIONS.md"
    else
        sed -i '' "2a\\
$new_row\\
" NATIVE_SDK_VERSIONS.md
        echo "Updated NATIVE_SDK_VERSIONS.md with entry for version $core_version"
    fi
else
    echo "Error: Missing version information"
    exit 1
fi
