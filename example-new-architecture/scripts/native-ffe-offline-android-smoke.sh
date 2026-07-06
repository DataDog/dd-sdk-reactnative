#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXAMPLE_DIR="$ROOT_DIR/example-new-architecture"
ANDROID_DIR="$EXAMPLE_DIR/android"
LOG_DIR="${NATIVE_FFE_SMOKE_LOG_DIR:-$ROOT_DIR/build/native-ffe-smoke}"
SUCCESS_TEXT="Native FFE offline fixture pass: 233 cases across 30 files"
PACKAGE_NAME="com.ddsdkreactnativeexample"
ACTIVITY_NAME="$PACKAGE_NAME/.MainActivity"

mkdir -p "$LOG_DIR"

ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$ANDROID_SDK_ROOT" ]]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT must be set." >&2
  exit 1
fi

ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
EMULATOR="$ANDROID_SDK_ROOT/emulator/emulator"

if [[ ! -x "$ADB" ]]; then
  echo "adb not found at $ADB" >&2
  exit 1
fi

metro_pid=""
emulator_pid=""

cleanup() {
  if [[ -n "$metro_pid" ]]; then
    kill "$metro_pid" >/dev/null 2>&1 || true
  fi
  if [[ -n "$emulator_pid" ]]; then
    "$ADB" emu kill >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

has_connected_device() {
  "$ADB" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

wait_for_boot() {
  "$ADB" wait-for-device
  for _ in $(seq 1 120); do
    if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for Android emulator boot." >&2
  exit 1
}

start_emulator_if_needed() {
  if has_connected_device; then
    return 0
  fi

  local avd_name="${NATIVE_FFE_ANDROID_AVD:-${EMULATOR_NAME:-android_emulator}}"
  if [[ ! -x "$EMULATOR" ]]; then
    echo "emulator not found at $EMULATOR" >&2
    exit 1
  fi

  "$EMULATOR" \
    -avd "$avd_name" \
    -no-window \
    -no-audio \
    -no-boot-anim \
    -gpu swiftshader_indirect \
    >"$LOG_DIR/emulator.log" 2>&1 &
  emulator_pid="$!"
  wait_for_boot
}

start_metro_if_needed() {
  if curl -fsS "http://localhost:8081/status" 2>/dev/null | grep -q "packager-status:running"; then
    return 0
  fi

  (
    cd "$EXAMPLE_DIR"
    yarn start --port 8081
  ) >"$LOG_DIR/metro.log" 2>&1 &
  metro_pid="$!"

  for _ in $(seq 1 60); do
    if curl -fsS "http://localhost:8081/status" 2>/dev/null | grep -q "packager-status:running"; then
      return 0
    fi
    sleep 2
  done

  echo "Timed out waiting for Metro on port 8081." >&2
  tail -100 "$LOG_DIR/metro.log" >&2 || true
  exit 1
}

install_and_launch_app() {
  "$ADB" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  for attempt in 1 2 3; do
    if (
      cd "$ANDROID_DIR"
      ./gradlew --no-daemon :app:installDebug
    ); then
      break
    fi
    if [[ "$attempt" == "3" ]]; then
      echo "Failed to install Android example after $attempt attempts." >&2
      exit 1
    fi
    echo "Android example install failed; retrying attempt $((attempt + 1)) of 3." >&2
    sleep 20
  done
  "$ADB" shell am force-stop "$PACKAGE_NAME" >/dev/null 2>&1 || true
  "$ADB" shell am start -n "$ACTIVITY_NAME" >/dev/null
}

wait_for_success_text() {
  for _ in $(seq 1 120); do
    if "$ADB" shell uiautomator dump /sdcard/native_ffe_window.xml >/dev/null 2>&1; then
      "$ADB" exec-out cat /sdcard/native_ffe_window.xml >"$LOG_DIR/window.xml" || true
      if grep -q "$SUCCESS_TEXT" "$LOG_DIR/window.xml"; then
        echo "$SUCCESS_TEXT"
        return 0
      fi
      if grep -Eq "Native FF(&amp;|&)E failed" "$LOG_DIR/window.xml"; then
        echo "Native FFE offline fixture runner failed." >&2
        grep -o "Native FF[^\"]*" "$LOG_DIR/window.xml" >&2 || true
        exit 1
      fi
    fi
    sleep 2
  done

  echo "Timed out waiting for '$SUCCESS_TEXT'." >&2
  "$ADB" logcat -d -t 300 ReactNativeJS '*:S' >"$LOG_DIR/react-native-js.log" || true
  tail -100 "$LOG_DIR/react-native-js.log" >&2 || true
  exit 1
}

start_emulator_if_needed
start_metro_if_needed
install_and_launch_app
wait_for_success_text
