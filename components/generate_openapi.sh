#!/bin/bash

# Default values
CONFIG="./src/api/config_checkoutexternal.yml"
DEFAULT_OUTPUT_DIR="src/api/checkoutexternal"
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

# Get output directory (we clean this before regenerating)
if command -v yq >/dev/null 2>&1; then
    OUTPUT_DIR=$(yq '.outputDir' "$CONFIG")
else
    echo "Warning: yq is not installed. Please install it with 'brew install yq' for better YAML parsing."
    echo "Falling back to default output directory."
    OUTPUT_DIR=$DEFAULT_OUTPUT_DIR
fi
if [ -z "$OUTPUT_DIR" ]; then
    echo "Warning: outputDir not found in config file. Using default."
    OUTPUT_DIR=$DEFAULT_OUTPUT_DIR
fi
echo "Using output directory: $OUTPUT_DIR"

# Build the command
COMMAND="bunx openapi-generator-cli generate -c $CONFIG"
if [ -n "$INPUT_SPEC" ]; then
    COMMAND="$COMMAND --input-spec=$INPUT_SPEC"
fi

# Clean and regenerate
rm -rf $OUTPUT_DIR
eval $COMMAND
bun run format
