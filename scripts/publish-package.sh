#!/bin/bash
set -euo pipefail

# publish-package.sh - Parse tag and publish to NPM
#
# Handles both stable releases and release candidates:
#   - Stable: schematic-react@1.3.0 -> publishes with 'latest' tag
#   - RC: schematic-react@1.3.0-rc.1 -> publishes with 'rc' tag
#
# Usage:
#   TAG="<tag>" ./scripts/publish-package.sh
#
# Examples:
#   TAG="schematic-react@1.3.0" ./scripts/publish-package.sh
#   TAG="schematic-react@1.3.0-rc.1" ./scripts/publish-package.sh schematic-react@1.3.0-rc.1
#
# Environment variables:
#   NPM_TOKEN - Required for publishing to NPM

if [[ -z "$TAG" ]]; then
    echo "Error: TAG env var required; should match git tag"
    echo "Usage: TAG=<tag> $0"
    exit 1
fi

# Parse tag into package and version
PACKAGE="${TAG%@*}"
VERSION="${TAG#*@}"

# Determine if this is an RC release
if [[ "$VERSION" =~ -rc\.[0-9]+$ ]]; then
    IS_RC=true
    NPM_TAG="rc"
else
    IS_RC=false
    NPM_TAG="latest"
fi

# Validate version format
if [[ "$IS_RC" == true ]]; then
    if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
        echo "Error: Version '$VERSION' is not a valid RC format"
        echo "Expected format: X.Y.Z-rc.N (e.g., 1.3.0-rc.1)"
        exit 1
    fi
else
    if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Version '$VERSION' is not a valid semver format"
        echo "Expected format: X.Y.Z (e.g., 1.3.0)"
        exit 1
    fi
fi

# Map package to working directory
case "$PACKAGE" in
    schematic-js)
        WORKING_DIR="js"
        ;;
    schematic-react)
        WORKING_DIR="react"
        ;;
    schematic-components)
        WORKING_DIR="components"
        ;;
    schematic-vue)
        WORKING_DIR="vue"
        ;;
    *)
        echo "Error: Unknown package '$PACKAGE'"
        echo "Valid packages: schematic-js, schematic-react, schematic-components, schematic-vue"
        exit 1
        ;;
esac

echo "=== NPM Publish ==="
echo "Package: $PACKAGE"
echo "Version: $VERSION"
echo "Directory: $WORKING_DIR"
echo "NPM Tag: $NPM_TAG"
echo "RC Release: $IS_RC"
echo ""

# Export for use in CI or other scripts
export PUBLISH_PACKAGE="$PACKAGE"
export PUBLISH_VERSION="$VERSION"
export PUBLISH_WORKING_DIR="$WORKING_DIR"
export PUBLISH_NPM_TAG="$NPM_TAG"
export PUBLISH_IS_RC="$IS_RC"

# Change to package directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../$WORKING_DIR"

# Verify package.json version matches expected version
ACTUAL_VERSION=$(awk -F'"' '/"version"/{print $4; exit}' package.json)
if [[ "$ACTUAL_VERSION" != "$VERSION" ]]; then
    echo "Error: package.json version '$ACTUAL_VERSION' does not match expected version '$VERSION'"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
yarn install

# Build
echo "Building..."
yarn build

# Set up npmrc if NPM_TOKEN is provided
if [[ -n "${NPM_TOKEN:-}" ]]; then
    echo "Setting up .npmrc..."
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
fi

# Publish
echo "Publishing to NPM with '$NPM_TAG' tag..."
yarn publish --new-version "$VERSION" --access public --tag "$NPM_TAG"
