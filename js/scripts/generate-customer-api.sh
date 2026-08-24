#!/bin/bash
# Regenerates the narrow customer API clients (src/customer/api/{public,customer})
# from the publishable-key and temporary-access-token OpenAPI specs, filtered to
# the catalog/company surface.
#
# Until the catalog API endpoints deploy, the source of truth is a local
# schematic-api checkout; point SCHEMATIC_API_DIR at it (default: ../../schematic-api).
# After deploy this can switch to the published specs:
#   https://openapi.schematichq.com/prod/api/apikeypublishable.yml
#   https://openapi.schematichq.com/prod/api/temporaryaccesstoken.yml
set -euo pipefail
cd "$(dirname "$0")/.."

SCHEMATIC_API_DIR="${SCHEMATIC_API_DIR:-../../schematic-api}"
SPEC_DIR="$SCHEMATIC_API_DIR/api/docs/api"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

generate() {
  local spec="$1" config="$2" output="$3"
  shift 3
  npx --yes js-yaml "$SPEC_DIR/$spec" > "$TMP_DIR/$spec.json"
  node scripts/filter-openapi.mjs "$TMP_DIR/$spec.json" "$TMP_DIR/$spec.filtered.json" "$@"
  rm -rf "$output"
  npx openapi-generator-cli generate -c "$config" --input-spec="$TMP_DIR/$spec.filtered.json"
}

generate apikeypublishable.yml src/customer/api/config_public.yml src/customer/api/public \
  /public/catalog "/public/catalogs/{catalog_id}"

generate temporaryaccesstoken.yml src/customer/api/config_customer.yml src/customer/api/customer \
  /catalog/view "/catalogs/{catalog_id}/view" \
  /company /company/credits /company/invoices /company/upcoming-invoice /company/usage

npx prettier --write "src/customer/api/{public,customer}/**/*.ts" > /dev/null
echo "customer API clients regenerated"
