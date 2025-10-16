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
bun install
bun run build

echo "📦 Linking components..."
bun link

echo "🏠 Navigating to demo app..."
cd ../../schematic-next-example || exit 1

echo "🔗 Linking components to demo app..."
bun link "@schematichq/schematic-components"

echo "🏗️ Installing dependencies..."
bun install --force

if [ "$choice" == "local" ]; then
    echo "🏗️ Building demo app..."
    bun run build

    echo "🚀 Starting dev server..."
    bun run dev
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