#!/bin/bash
# Copies the golden responses the schematic-api route tests record
# (UPDATE_GOLDENS=1 go test …) into src/company/goldens, where
# goldens.spec.ts decodes them through the generated models — so a
# required-field change on either side fails fast (RFC 0007 "Contract
# freeze"). Point SCHEMATIC_API_DIR at a checkout (default: ../../schematic-api).
set -euo pipefail
cd "$(dirname "$0")/.."
SCHEMATIC_API_DIR="${SCHEMATIC_API_DIR:-../../schematic-api}"
DEST=src/company/goldens
mkdir -p "$DEST"
cp "$SCHEMATIC_API_DIR/api/apps/checkoutexternal/web/testdata/goldens"/*.json "$DEST"/
ls "$DEST"
