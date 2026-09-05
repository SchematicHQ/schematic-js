#!/bin/bash
# scripts/test-components-locally.sh

VERCEL_SCOPE="team_5rA0CJ7KWwUQut8p773DLhUz" # Schematic Vercel scope

# ask user to test locally or on Vercel
read -p "Do you want to test locally or on Vercel? (local/vercel): " choice

if [ "$choice" != "local" ] && [ "$choice" != "vercel" ]; then
    echo "Invalid choice. Please enter 'local' or 'vercel'."
    exit 1
fi

# build components, plus the workspace packages it links to (js, react) —
# their gitignored dist/ is what the `workspace:` links resolve to.
echo "🔨 Building components..."
cd "$(dirname "$0")/.." || exit 1
pnpm install || exit 1
pnpm --filter "@schematichq/schematic-components..." run build || exit 1
cd components || exit 1

# Packing is the truer test: it exercises the `files` list and `exports` map
# the demo app would get from npm, which a symlink bypasses.
echo "📦 Packing components..."
TARBALL=$(pnpm pack --pack-destination "${TMPDIR:-/tmp}" | tail -n1) || exit 1
echo "   $TARBALL"

echo "🏠 Navigating to demo app..."
cd ../../schematic-next-example || exit 1

# `pnpm add` pins the demo app's manifest to a TMPDIR path the OS will reap,
# so restore both files on exit. Copies rather than `git checkout`, which
# would take unrelated edits with it.
MANIFEST_BACKUP=$(mktemp -d) || exit 1
cp package.json pnpm-lock.yaml "$MANIFEST_BACKUP/" || exit 1
restore_manifest() {
    cp "$MANIFEST_BACKUP"/package.json "$MANIFEST_BACKUP"/pnpm-lock.yaml . 2>/dev/null
    rm -rf "$MANIFEST_BACKUP"
}
trap restore_manifest EXIT

echo "🏗️ Installing dependencies against the packed build..."
pnpm add "$TARBALL"

if [ "$choice" == "local" ]; then
    echo "🏗️ Building demo app..."
    pnpm run build

    echo "🚀 Starting dev server..."
    pnpm run dev
fi

if [ "$choice" == "vercel" ]; then

    # check if vercel is installed
    if ! command -v vercel &> /dev/null; then
        echo "Vercel is not installed. Please install it from https://vercel.com/docs/cli"
        exit 1
    fi

    echo "🔗 Linking demo app to Vercel..."
    vercel link --yes --scope $VERCEL_SCOPE
    vercel env pull --yes --scope $VERCEL_SCOPE
    vercel pull --yes --scope $VERCEL_SCOPE

    echo "🔗 vercel build"
    vercel build
    
    echo "🚀 Deploying Preview on Vercel..."
    vercel --prebuilt
fi