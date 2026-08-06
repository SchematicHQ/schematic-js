#!/bin/bash
set -e

# Default values
CONFIG="./src/api/config_componentspublic.yml"
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

# Get output directory from the config (we clean this before regenerating).
# The configs are flat YAML, so a sed read is sufficient and avoids guessing:
# a wrong guess here would rm -rf a different generated client.
OUTPUT_DIR=$(sed -n 's/^outputDir:[[:space:]]*//p' "$CONFIG" | head -1 | tr -d "\"'")
if [ -z "$OUTPUT_DIR" ]; then
    echo "Error: could not determine outputDir from $CONFIG; refusing to continue." >&2
    exit 1
fi
echo "Using output directory: $OUTPUT_DIR"

# Build the command
COMMAND="npx openapi-generator-cli generate -c $CONFIG"
if [ -n "$INPUT_SPEC" ]; then
    COMMAND="$COMMAND --input-spec=$INPUT_SPEC"
fi

# Clean and regenerate
rm -rf "$OUTPUT_DIR"
eval $COMMAND
npx prettier --write "$OUTPUT_DIR"
