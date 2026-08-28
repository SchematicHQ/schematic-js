#!/bin/bash
# scripts/test-components-locally.sh

VERCEL_SCOPE="team_5rA0CJ7KWwUQut8p773DLhUz" # Schematic Vercel scope

# ask user to test locally or on Vercel
read -p "Do you want to test locally or on Vercel? (local/vercel): " choice

if [ "$choice" != "local" ] && [ "$choice" != "vercel" ]; then
    echo "Invalid choice. Please enter 'local' or 'vercel'."
    exit 1
fi

# build components
echo "🔨 Building components..."
cd ../components || exit 1
pnpm install
pnpm run build

# A tarball rather than `yarn link`, which is the truer test: it exercises the
# `files` list and `exports` map the demo app would get from npm, where a
# symlinked source tree bypasses both.
echo "📦 Packing components..."
TARBALL=$(pnpm pack --pack-destination "${TMPDIR:-/tmp}" | tail -n1) || exit 1
echo "   $TARBALL"

echo "🏠 Navigating to demo app..."
cd ../../schematic-next-example || exit 1

# Installing the tarball pins the demo app's manifest to a path under TMPDIR,
# which the OS eventually reaps -- leave that behind and the next plain
# install over there fails on an unresolvable version. Stash the two files
# and put them back however we exit, rather than `git checkout`-ing them,
# which would take any unrelated edits down with it. node_modules keeps the
# packed build either way.
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