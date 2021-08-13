#!/bin/bash
list_archive_content() {
   tar -tvf $1 | awk '{print $9}' | sort
}

display_help() {
   echo "Checks the content of the release."
   echo
   echo "Syntax:"
   echo "check-release-content <release-archive> <expected-release-content-file> - do comparison check"
   echo "check-release-content -p <release-archive> - print release archive content"
   echo
}

if [ "$1" == "-h" ]; then
  display_help
  exit 0
fi

if [ "$1" == "-p" ]; then
  echo "$(list_archive_content $2)"
  exit 0
fi

current_release_content=$(list_archive_content $1)
reference_release_content_file=$2
output=$(diff -w $reference_release_content_file <(echo "$current_release_content"))

if [ "$output" != "" ]
then
   echo "Release content is different from expected, check the package and update the reference if necessary."
   echo "$output"
   exit 1
fi
exit 0
