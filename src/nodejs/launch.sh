#!/bin/bash

BASEDIR=$(dirname $BASH_SOURCE)
NODE=node
if [ "$DEBUG" = "true" ] ; then
NODE=node-debug;
fi

$NODE "$BASEDIR/launcher.js" "$@"
