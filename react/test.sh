#!/bin/bash
# Detect Node.js major version using awk
NODE_MAJOR=$(node -v | awk -F'[.v]' '{print $2}')

# For Node v25+, disable native Web Storage API
if [ "$NODE_MAJOR" -ge 25 ]; then
    export NODE_OPTIONS="--no-webstorage"
fi

# Run vitest with any passed arguments
vitest run "$@"
