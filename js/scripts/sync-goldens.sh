#!/bin/bash
# Copies the golden responses the schematic-api route tests record
# (UPDATE_GOLDENS=1 task test:run …) into src/customer/goldens, where
# goldens.spec.ts decodes them through the generated clients and runs the
# derivations over them — so a required-field change on either side fails
# fast (RFC 0007 "Contract freeze"). Point SCHEMATIC_API_DIR at a checkout
# (default: ../../schematic-api).
set -euo pipefail
cd "$(dirname "$0")/.."
SCHEMATIC_API_DIR="${SCHEMATIC_API_DIR:-../../schematic-api}"
DEST=src/customer/goldens
mkdir -p "$DEST"
for dir in catalogs checkoutexternal; do
  src="$SCHEMATIC_API_DIR/api/apps/$dir/web/testdata/goldens"
  [ -d "$src" ] || continue
  cp "$src"/*.json "$DEST"/
done
ls "$DEST"
