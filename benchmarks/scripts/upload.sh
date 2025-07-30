#!/bin/bash

# Upload app binary to synthetics to be used on tests
#
# Usage: ./upload.sh FILE_PATH PLATFORM

set -e
source ./scripts/secrets/get-secret.sh


FILE_PATH=$1    # Path to app binary (.ipa/.apk)
PLATFORM=$2     # IOS/ANDROID

API_KEY="$(get_secret $DD_RN_BENCHMARK_API_KEY)"
APP_KEY="$(get_secret $DD_RN_BENCHMARK_APP_KEY)"

if [ "$PLATFORM" = "ANDROID" ]; then
    SYNTHETICS_APP_ID="$(get_secret "$DD_RN_BENCHMARK_SYNTHETICS_ANDROID_APP_ID")"
elif [ "$PLATFORM" = "IOS" ]; then
    SYNTHETICS_APP_ID="$(get_secret "$DD_RN_BENCHMARK_SYNTHETICS_IOS_APP_ID")"
else
    echo "Can't upload - Unknown platform ${PLATFORM}"
    exit 1
fi

timestamp=$(date +"%Y/%m/%d-%H:%M:%S")

yarn datadog-ci synthetics upload-application --apiKey $API_KEY --appKey $APP_KEY --mobileApplicationId $SYNTHETICS_APP_ID --mobileApplicationVersionFilePath $FILE_PATH --versionName "benchmark_${PLATFORM}_${timestamp}" --latest
