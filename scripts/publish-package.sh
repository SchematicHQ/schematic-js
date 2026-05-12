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
#   TAG="schematic-react@1.3.0-rc.1" ./scripts/publish-package.sh
#
# In CI this runs under npm Trusted Publishing (OIDC); no NPM_TOKEN is needed.
# If NPM_TOKEN is set in the environment, it is used as a fallback (useful for
# local testing).

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
    schematic-angular)
        WORKING_DIR="angular"
        ;;
    *)
        echo "Error: Unknown package '$PACKAGE'"
        echo "Valid packages: schematic-js, schematic-react, schematic-components, schematic-vue, schematic-angular"
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

# Determine publish directory
# ng-packagr (used by angular) generates a complete package in dist/
if [[ "$PACKAGE" == "schematic-angular" ]]; then
    PUBLISH_DIR="dist"
else
    PUBLISH_DIR="."
fi

# Authenticate to npm. In CI, exchange the GitHub OIDC token for a short-lived
# npm publish token (Trusted Publishing). For local use, fall back to NPM_TOKEN.
if [[ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" && -n "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]; then
    AUDIENCE="npm%3Aregistry.npmjs.org"
    OIDC_URL="${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${AUDIENCE}"

    echo "Requesting GitHub OIDC token (audience: ${AUDIENCE})..."
    GH_OIDC_RESPONSE=$(curl -fsSL --retry 3 \
        -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
        -H "Accept: application/json" \
        "${OIDC_URL}") || { echo "Failed to fetch OIDC token from GitHub"; exit 1; }
    OIDC_TOKEN=$(echo "$GH_OIDC_RESPONSE" | node -e 'let d=""; process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).value))')
    if [[ -z "$OIDC_TOKEN" || "$OIDC_TOKEN" == "undefined" ]]; then
        echo "GitHub OIDC response did not contain a token: $GH_OIDC_RESPONSE"
        exit 1
    fi
    echo "Got GitHub OIDC token (length: ${#OIDC_TOKEN})"

    echo "Exchanging for npm publish token..."
    NPM_PACKAGE_PATH="@schematichq%2F${PACKAGE}"
    NPM_EXCHANGE_RESPONSE=$(curl -fsSL --retry 3 -X POST \
        -H "Authorization: Bearer ${OIDC_TOKEN}" \
        -H "Accept: application/json" \
        "https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/${NPM_PACKAGE_PATH}") || { echo "Failed to exchange OIDC token with npm"; exit 1; }
    NPM_PUBLISH_TOKEN=$(echo "$NPM_EXCHANGE_RESPONSE" | node -e 'let d=""; process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).token))')
    if [[ -z "$NPM_PUBLISH_TOKEN" || "$NPM_PUBLISH_TOKEN" == "undefined" ]]; then
        echo "npm exchange response did not contain a token: $NPM_EXCHANGE_RESPONSE"
        exit 1
    fi
    echo "Got npm publish token (length: ${#NPM_PUBLISH_TOKEN})"

    echo "//registry.npmjs.org/:_authToken=${NPM_PUBLISH_TOKEN}" > .npmrc
elif [[ -n "${NPM_TOKEN:-}" ]]; then
    echo "Setting up .npmrc with NPM_TOKEN..."
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
fi

# Publish
echo "Publishing $VERSION to NPM with '$NPM_TAG' tag..."
npm publish "./$PUBLISH_DIR" --access public --tag "$NPM_TAG"
