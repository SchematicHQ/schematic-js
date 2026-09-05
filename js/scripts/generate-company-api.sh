#!/bin/bash
# Regenerates the narrow company API client (src/company/api/company)
# from the temporary-access-token OpenAPI spec, filtered to the company
# surface this branch ships (/company/invoices; siblings join with their
# elements).
#
# Until the endpoints deploy, the source of truth is a local schematic-api
# checkout; point SCHEMATIC_API_DIR at it (default: ../../schematic-api).
# After deploy this can switch to the published spec:
#   https://openapi.schematichq.com/prod/api/temporaryaccesstoken.yml
set -euo pipefail
cd "$(dirname "$0")/.."

SCHEMATIC_API_DIR="${SCHEMATIC_API_DIR:-../../schematic-api}"
SPEC_DIR="$SCHEMATIC_API_DIR/api/docs/api"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

npx js-yaml "$SPEC_DIR/temporaryaccesstoken.yml" > "$TMP_DIR/spec.json"
node scripts/filter-openapi.mjs "$TMP_DIR/spec.json" "$TMP_DIR/spec.filtered.json" \
  /company/invoices
rm -rf src/company/api/company
npx openapi-generator-cli generate -c src/company/api/config_company.yml \
  --input-spec="$TMP_DIR/spec.filtered.json"
npx prettier --write "src/company/api/company/**/*.ts" > /dev/null
echo "company API client regenerated"
