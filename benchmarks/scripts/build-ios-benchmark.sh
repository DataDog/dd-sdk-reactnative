#!/bin/bash
set -eo pipefail
source ./scripts/secrets/config.sh
source ./scripts/secrets/get-secret.sh

# Builds the iOS Benchmark app
#
# Usage: ./build-ios-benhchmark.sh

CODE_SIGN_STYLE="${CODE_SIGN_STYLE:-Manual}"
CODE_SIGN_IDENTITY="${CODE_SIGN_IDENTITY:-Apple Development: Sergio Barrio (64DLL4SMU9)}"
PROVISIONING_PROFILE_SPECIFIER="${PROVISIONING_PROFILE_SPECIFIER:-React Native Benchmark App}"
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-JKFCB4CN7C}"

function setup_ios_singing {
    mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"

    get_secret $DD_RN_BENCHMARK_E2E_PROVISIONING_PROFILE_BASE64 | base64 --decode > "$HOME/Library/MobileDevice/Provisioning Profiles/datadog.mobileprovision"
    
    export KEYCHAIN_PASSWORD="$(openssl rand -base64 32)"
    export KEYCHAIN="datadog.keychain"
    security delete-keychain "$KEYCHAIN" || true
    security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
    security set-keychain-settings -lut 21600 "$KEYCHAIN"
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
    security list-keychain -d user -s "$KEYCHAIN" "login.keychain" "System.keychain"

    get_secret $DD_RN_BENCHMARK_E2E_CERTIFICATE_P12_BASE64 | base64 --decode > "datadog.certificate.p12"
    export P12_PASSWORD="$(get_secret $DD_RN_BENCHMARK_E2E_CERTIFICATE_PASSWORD)"

    security import "datadog.certificate.p12" -P $P12_PASSWORD -A -t cert -f pkcs12 -k $KEYCHAIN
    security set-key-partition-list -S "apple-tool:,apple:" -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
}

function build_ios_app {
    cd ${ROOT}/ios

    echo export NODE_BINARY=$(command -v node) > ${ROOT}/ios/.xcode.env
    rm Podfile.lock || true
    RCT_NEW_ARCH_ENABLED=1 pod install --repo-update

    # Build & Archive
    LOG_PATH="${XCODEBUILD_LOG_PATH:-logs/xcodebuild_full_output_benchmark_runner.log}"
    mkdir -p logs
    touch "$LOG_PATH"
    echo "=== Creating iOS archive ===" | tee -a "$LOG_PATH"

    xcodebuild -workspace BenchmarkRunner.xcworkspace \
               -scheme BenchmarkRunner clean archive \
               -configuration release \
               -sdk iphoneos \
               -archivePath BenchmarkRunner.xcarchive \
               CODE_SIGN_STYLE="$CODE_SIGN_STYLE" \
               CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
               PROVISIONING_PROFILE_SPECIFIER="$PROVISIONING_PROFILE_SPECIFIER" \
               DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
               2>&1 | tee -a "$LOG_PATH" | xcbeautify || exit 1

    # Export IPA
    echo "=== Exporting iOS ipa ===" | tee -a "$LOG_PATH"

    xcodebuild -exportArchive \
               -archivePath BenchmarkRunner.xcarchive \
               -exportOptionsPlist ./exportOptions.plist \
               -exportPath BenchmarkRunner.ipa \
               2>&1 | tee -a "$LOG_PATH" | xcbeautify || exit 1
}

setup_ios_singing
build_ios_app

cd $ROOT