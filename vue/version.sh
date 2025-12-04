#!/bin/bash

# Extract version from package.json and write to version.ts
VERSION=$(node -p "require('./package.json').version")
echo "export const version = \"$VERSION\";" > src/version.ts
echo "Generated version.ts with version $VERSION"

