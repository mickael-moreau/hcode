#!/bin/bash

BASEDIR=$(dirname $BASH_SOURCE)
CHROME=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
"$CHROME" --allow-file-access-from-files "file:///$PWD/$BASEDIR/main.html"
