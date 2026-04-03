#!/bin/bash
# Clean build script - removes all caches before building
# Run: npm run clean-build

set -e

echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf out
rm -rf src-tauri/target
rm -rf node_modules/.cache

echo "✅ Cache cleaned!"
echo "🏗️  Running build..."

npm run build

echo "✅ Build complete!"
