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
    "packages/react-native-webview/android/build.gradle"
)

extract_and_validate_version() {
    local files=("${!1}")
    local grep_pattern="$2"
    local sed_expr="$3"
    local platform_name="$4"
    local version_var_name="$5"

    local overall_version=""

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            local version_set=()
            local line
            while IFS= read -r line; do
                local parsed
                parsed=$(echo "$line" | sed "$sed_expr")
                if [ -n "$parsed" ]; then
                    version_set+=("$parsed")
                fi
            done < <(grep "$grep_pattern" "$file")

            # Remove duplicates
            unique_versions=$(printf "%s\n" "${version_set[@]}" | sort -u)
            version_count=$(printf "%s\n" "${unique_versions}" | wc -l)

            if [ "$version_count" -eq 0 ]; then
                continue
            elif [ "$version_count" -gt 1 ]; then
                echo "Error: Found multiple $platform_name SDK versions in $file:"
                printf "%s " $unique_versions
                printf "\nPlease make sure the same SDK version is used."
                exit 1
            fi

            extracted_version=$(echo "$unique_versions" | head -n 1)

            if [ -z "$overall_version" ]; then
                overall_version="$extracted_version"
            elif [ "$overall_version" != "$extracted_version" ]; then
                echo "Error: Found different $platform_name SDK versions:"
                echo "$overall_version and $extracted_version"
                echo "Please align the versions in all $platform_name files."
                exit 1
            fi
        else
            echo "Warning: File $file not found"
        fi
    done

    eval "$version_var_name=\"$overall_version\""
}


# Get core RN package version
if [ -f "$core_package_json" ]; then
    core_version=$(grep '"version":' "$core_package_json" | cut -d'"' -f4)
else
    echo "Error: Core package.json not found at $core_package_json"
    exit 1
fi

# Get iOS version
extract_and_validate_version podspec_files[@] "dependency 'Datadog.*' *, *'" "s/.*dependency *'Datadog.*, *'\([0-9.]*\).*/\1/" "iOS" ios_version

# Get Android version
extract_and_validate_version build_gradle_files[@] "com.datadoghq:dd-sdk-android" 's/.*:\([0-9.]*\).*/\1/' "Android" android_version

# Check if NATIVE_SDK_VERSIONS.md exists, create it otherwise
if [ ! -f "NATIVE_SDK_VERSIONS.md" ]; then
    echo "| React Native | iOS Bridge / iOS SDK | Android Bridge / Android SDK |" > NATIVE_SDK_VERSIONS.md
    echo "|-------------|---------------------|----------------------------|" >> NATIVE_SDK_VERSIONS.md
    echo "Creating new NATIVE_SDK_VERSIONS.md file with header"
fi

# Add the new version triad to NATIVE_SDK_VERSIONS.md
should_exit=0
if [ -z "$core_version" ]; then
    echo "Error: missing core version"
    should_exit=1
fi

if [ -z "$ios_version" ]; then
    echo "Error: missing iOS version"
    should_exit=1
fi

if [ -z "$android_version" ]; then
    echo "Error: missing Android version"
    should_exit=1
fi

if [ $should_exit -eq 1 ]; then
    echo "Exiting due to missing version information"
    exit 1
fi

new_row="| $core_version | $ios_version | $android_version |"

first_version_row=$(sed -n '3p' NATIVE_SDK_VERSIONS.md)

if [ "$first_version_row" = "$new_row" ]; then
    echo "Entry for version $core_version already exists in NATIVE_SDK_VERSIONS.md"
else
    sed -i '' "2a\\
$new_row\\
" NATIVE_SDK_VERSIONS.md
    echo "Updated NATIVE_SDK_VERSIONS.md with entry for version $core_version"
fi
