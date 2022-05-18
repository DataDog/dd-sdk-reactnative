#!/bin/bash

# Because we renamed @react-navigation/native to @react-navigation/native-v5 and @react-navigation/native-v6,
# we need to make sure that dependencies that use these packages have the correct imports.
# With this script we find all the js files in these packages, then replace @react-navigation/native with the
# correct import name.

# sets directory to this one - see https://stackoverflow.com/a/3355423
cd "$(dirname "$0")"

find ../../node_modules/@react-navigation/stack-v5/. -name '*.js' -print0 | xargs -0 sed -i '' 's/@react-navigation\/native\"/@react-navigation\/native-v5\"/g' 
find ../../node_modules/@react-navigation/stack-v6/. -name '*.js' -print0 | xargs -0 sed -i '' 's/@react-navigation\/native\"/@react-navigation\/native-v6\"/g' 
find ../../node_modules/@react-navigation/elements/. -name '*.js' -print0 | xargs -0 sed -i '' 's/@react-navigation\/native\"/@react-navigation\/native-v6\"/g'
