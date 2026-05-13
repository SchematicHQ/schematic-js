#!/bin/bash
VERSION=$(jq -r .version package.json)
echo "export const version = '$VERSION';" > src/version.ts
