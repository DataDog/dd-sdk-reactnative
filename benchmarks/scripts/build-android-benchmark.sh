set -e
source ./scripts/secrets/config.sh

# Builds the Android Benchmark app
#
# Usage: ./scripts/build-android-benchmark.sh

function build_android_app {

    if [ ! -d "./android/app/src/main/assets" ]; then
        mkdir ./android/app/src/main/assets
    fi

    touch ./android/app/src/main/assets/index.android

    # Generate bundle
    echo "Generating bundle..."

    npx react-native bundle \
        --platform android \
        --dev false \
        --entry-file index.js \
        --bundle-output android/app/src/main/assets/index.android.bundle \
        --assets-dest android/app/build/intermediates/res/merged/release/ \

    rm -rf android/app/src/main/res/drawable-*
    rm -rf android/app/src/main/res/raw/*
    echo "Building Android App in release mode..."
    echo "Assembling Release APK..."
    cd android
    ./gradlew assembleRelease || exit 1
}

# run_checks
build_android_app

cd $ROOT
