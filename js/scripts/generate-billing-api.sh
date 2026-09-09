#!/bin/bash
# Regenerates the narrow billing API client (src/billing/api/generated)
# from the temporary-access-token OpenAPI spec, filtered to the surface this
# branch ships (/company/invoices; hydrate, checkout and the rest join with
# their elements).
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

# pnpm exec, not npx: js-yaml is a declared devDependency, so this resolves
# it from the workspace rather than fetching whatever the registry has now —
# which would sidestep the minimumReleaseAge guard in pnpm-workspace.yaml.
pnpm exec js-yaml "$SPEC_DIR/temporaryaccesstoken.yml" > "$TMP_DIR/spec.json"
node scripts/filter-openapi.mjs "$TMP_DIR/spec.json" "$TMP_DIR/spec.filtered.json" \
  /company/invoices
rm -rf src/billing/api/generated
pnpm exec openapi-generator-cli generate -c src/billing/api/config.yml \
  --input-spec="$TMP_DIR/spec.filtered.json"
pnpm exec prettier --write "src/billing/api/generated/**/*.ts" > /dev/null
echo "billing API client regenerated"
