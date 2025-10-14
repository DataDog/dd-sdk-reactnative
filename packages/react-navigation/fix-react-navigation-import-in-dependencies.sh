#!/bin/bash

# Because we renamed @react-navigation/native to @react-navigation/native-v5 and @react-navigation/native-v6,
# we need to make sure that dependencies that use these packages have the correct imports.
# With this script we find all the js files in these packages, then replace @react-navigation/native with the
# correct import name.

# Sets directory to this one - see https://stackoverflow.com/a/3355423
cd "$(dirname "$0")" || {
  echo "[@datadog/mobile-react-navigation] WARNING: Failed to change directory."
}

# Track whether any warnings occurred
had_warnings=false

# Helper function to run find/sed safely
safe_replace() {
  local dir=$1
  local replace=$2

  if [ -d "$dir" ]; then
    echo "[@datadog/mobile-react-navigation] Processing $dir ..."
    find "$dir" -name '*.js' -print0 2>/dev/null | \
      xargs -0 sed -i '' "$replace" 2>/dev/null || {
        echo "[@datadog/mobile-react-navigation] WARNING: Replacement failed for $dir"
        had_warnings=true
      }
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
  echo "[@datadog/mobile-react-navigation] WARNING: Completed with warnings."
else
  echo "[@datadog/mobile-react-navigation] Completed successfully with no warnings."
fi

exit 0
