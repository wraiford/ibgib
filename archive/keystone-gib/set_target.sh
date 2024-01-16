#!/bin/bash

# This script is for changing between node and browser targets.
# The driving use case is hashing, which requires the crypto lib.
# Node and browser differ here.
# I can't get testing to work in the browser (karma apparently disdains ES6
# imports and can't get mocha html working),
# and anything I do that tries to bundle differently between browser and web
# fails with webpack/tsc. So this is my own hack.


if [[ $1 == node ]] || [[ $1 == browser ]]; then
  echo "TARGET is: $1"

  Files=('./src/V1/sha256v1.ts' './src/helper.ts')
  echo "Files is..." ${Files[@]}

  for file in "${Files[@]}"; do
    echo ""
    echo $file

    NoExt=${file%.ts}
    TargetSrcFile=$NoExt"."$1".ts"
    echo "TargetSrcFile: " $TargetSrcFile
    if [[ -e $TargetSrcFile ]]; then
      echo "file exists"
      if [[ -e $file ]]; then
        echo "Backing up previous..."
        cp $file $file".BAK"
      fi
      cp $TargetSrcFile $file
    else
      echo "WARN: Node File doesn't exist:"$TargetSrcFile
    fi

    echo "file complete."
    echo ""
  done
  echo "Setting target to $1 COMPLETE."
else
  echo "INVALID TARGET. Must be node or browser"
fi
