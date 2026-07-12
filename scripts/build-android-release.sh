#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/bundle/release"

cd "$ROOT_DIR"

if [[ ! -f "$ANDROID_DIR/keystore.properties" ]]; then
  echo "Missing android/keystore.properties"
  echo "Run: npm run android:keystore"
  exit 1
fi

echo "Building Android App Bundle (AAB) for Google Play..."
cd "$ANDROID_DIR"
./gradlew bundleRelease

AAB_PATH="$OUTPUT_DIR/app-release.aab"
if [[ -f "$AAB_PATH" ]]; then
  echo
  echo "Upload this file to Google Play Console:"
  echo "  $AAB_PATH"
else
  echo "Build finished but AAB was not found at expected path."
  exit 1
fi
