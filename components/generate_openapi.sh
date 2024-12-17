#!/bin/bash

# Default values
CONFIG="./openapi-config.yaml"
INPUT_SPEC=""

# Parse arguments
for arg in "$@"
do
    case $arg in
        --spec=*)
        INPUT_SPEC="${arg#*=}"
        shift
        ;;
        -c|--config)
        CONFIG="$2"
        shift
        shift
        ;;
        *)
        # unknown option
        ;;
    esac
done

# Build the command
COMMAND="npx openapi-generator-cli generate -c $CONFIG"
if [ -n "$INPUT_SPEC" ]; then
    COMMAND="$COMMAND --input-spec=$INPUT_SPEC"
fi

# Execute the command
rm -rf src/api/
eval $COMMAND
yarn format
