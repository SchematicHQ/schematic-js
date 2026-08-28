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

# A tarball rather than `yarn link`. The demo app is a separate repo still on
# yarn, but no yarn will register a link from here: a corepack shim refuses
# because `packageManager` names pnpm, and a real yarn 1.22 makes its own
# check and chokes on the same field. Packing also exercises the `files` list
# and `exports` map the way a real install does.
echo "📦 Packing components..."
TARBALL=$(pnpm pack --pack-destination "${TMPDIR:-/tmp}" | tail -n1) || exit 1
echo "   $TARBALL"

echo "🏠 Navigating to demo app..."
cd ../../schematic-next-example || exit 1

echo "🏗️ Installing dependencies against the packed build..."
yarn add "$TARBALL"

if [ "$choice" == "local" ]; then
    echo "🏗️ Building demo app..."
    yarn build

    echo "🚀 Starting dev server..."
    yarn dev
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