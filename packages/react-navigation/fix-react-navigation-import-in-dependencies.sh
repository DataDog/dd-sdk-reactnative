#!/bin/bash

# Because we renamed @react-navigation/native to @react-navigation/native-v5 and @react-navigation/native-v6,
# we need to make sure that dependencies that use these packages have the correct imports.
# With this script we find all the js files in these packages, then replace @react-navigation/native with the
# correct import name.

# Sets directory to this one - see https://stackoverflow.com/a/3355423
cd "$(dirname "$0")" || {
  echo "[@datadog/mobile-react-navigation] WARNING: Failed to change directory."
}

# Detect OS for sed compatibility
# macOS uses BSD sed (requires -i ''), Linux uses GNU sed (just -i)
if [[ "$OSTYPE" == "darwin"* ]]; then
  SED_INPLACE=(-i '')
else
  SED_INPLACE=(-i)
fi

# Track whether any warnings occurred
had_warnings=false

# Helper function to run find/sed safely
safe_replace() {
  local dir=$1
  local replace=$2

  if [ -d "$dir" ]; then
    echo "[@datadog/mobile-react-navigation] Processing $dir ..."
    # Capture stderr from sed and print if non-empty
    local sed_errors
    sed_errors=$(find "$dir" -name '*.js' -print0 2>/dev/null | \
      xargs -0 sed "${SED_INPLACE[@]}" "$replace" 2>&1)
    if [ $? -ne 0 ]; then
      echo "[@datadog/mobile-react-navigation] WARNING: Replacement failed for $dir"
      echo "[@datadog/mobile-react-navigation] Error details:"
      echo "$sed_errors"
      had_warnings=true
    elif [ -n "$sed_errors" ]; then
      # Sometimes sed emits warnings but exits successfully
      echo "[@datadog/mobile-react-navigation] NOTE: sed produced warnings for $dir:"
      echo "$sed_errors"
      had_warnings=true
    fi
  else
    echo "[@datadog/mobile-react-navigation] WARNING: Directory not found: $dir"
    had_warnings=true
  fi
}

safe_replace "../../node_modules/@react-navigation/stack-v5/." 's/@react-navigation\/native"/@react-navigation\/native-v5"/g'
safe_replace "../../node_modules/@react-navigation/stack-v6/." 's/@react-navigation\/native"/@react-navigation\/native-v6"/g'
safe_replace "../../node_modules/@react-navigation/elements/." 's/@react-navigation\/native"/@react-navigation\/native-v6"/g'

# Final summary
if [ "$had_warnings" = true ]; then
  echo ""
  echo "[@datadog/mobile-react-navigation] ⚠️  IMPORTANT: Script completed with warnings."
  echo "[@datadog/mobile-react-navigation] React Navigation imports may not have been updated correctly."
  echo "[@datadog/mobile-react-navigation] Please review the logs above — your project’s navigation might not work as expected."
else
  echo "[@datadog/mobile-react-navigation] ✅ Completed successfully with no warnings."
fi

exit 0
