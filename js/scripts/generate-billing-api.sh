#!/bin/bash
# Regenerates the narrow billing API client (src/billing/api/generated):
# the temporary-access-token OpenAPI spec filtered to the paths below, merged
# with the publishable-key spec filtered to the public catalog, so the catalog
# models both routes return are generated once.
#
# The specs are read from a local schematic-api checkout (SCHEMATIC_API_DIR,
# default ../../schematic-api), so routes can be generated before they are
# published at https://openapi.schematichq.com/prod/api/temporaryaccesstoken.yml
# and https://openapi.schematichq.com/prod/api/apikeypublishable.yml.
set -euo pipefail
cd "$(dirname "$0")/.."

SCHEMATIC_API_DIR="${SCHEMATIC_API_DIR:-../../schematic-api}"
SPEC_DIR="$SCHEMATIC_API_DIR/api/docs/api"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# pnpm exec, not npx: js-yaml is a declared devDependency, so this resolves
# it from the workspace rather than fetching whatever the registry has now —
# which would sidestep the minimumReleaseAge guard in pnpm-workspace.yaml.
pnpm exec js-yaml "$SPEC_DIR/temporaryaccesstoken.yml" > "$TMP_DIR/token.json"
pnpm exec js-yaml "$SPEC_DIR/apikeypublishable.yml" > "$TMP_DIR/publishable.json"
node scripts/filter-openapi.mjs "$TMP_DIR/token.json" "$TMP_DIR/token.filtered.json" \
  /company /company/invoices /company/upcoming-invoice /company/payment-methods \
  /company/usage '/company/usage/{feature_id}/users' \
  /company/credits '/company/credits/{credit_id}/users' \
  /catalog/view '/catalogs/{catalog_id}/view' \
  /checkouts '/checkouts/{checkout_id}' '/checkouts/{checkout_id}/finalize' \
  /checkout/tax-id \
  /checkout/paymentmethod/update '/checkout/paymentmethod/{checkout_id}' /checkout/unsubscribe \
  /components/setup-intent
node scripts/filter-openapi.mjs "$TMP_DIR/publishable.json" "$TMP_DIR/publishable.filtered.json" \
  /public/catalog '/public/catalogs/{catalog_id}'
node scripts/merge-openapi.mjs "$TMP_DIR/spec.json" \
  "$TMP_DIR/token.filtered.json" "$TMP_DIR/publishable.filtered.json"
rm -rf src/billing/api/generated
pnpm exec openapi-generator-cli generate -c src/billing/api/config.yml \
  --input-spec="$TMP_DIR/spec.json"
pnpm exec prettier --write "src/billing/api/generated/**/*.ts" > /dev/null
echo "billing API client regenerated"
