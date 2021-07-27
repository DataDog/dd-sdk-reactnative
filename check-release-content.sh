#!/bin/bash
package_file=$1
reference_release_content_file=$2
current_release_content=$(tar -tvf $package_file | awk '{print $9}')
output=$(diff -w $reference_release_content_file <(echo "$current_release_content"))
if [ "$output" != "" ]
then
   echo "Release content is different from expected, check the package and update the reference if necessary."
   echo "$output"
   exit 1
fi
exit 0
