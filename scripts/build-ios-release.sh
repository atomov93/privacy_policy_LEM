#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
WORKSPACE="$IOS_DIR/LetsMessageEncrypt.xcworkspace"
SCHEME="LetsMessageEncrypt"
ARCHIVE_PATH="$ROOT_DIR/build/ios/LetsMessageEncrypt.xcarchive"
EXPORT_PATH="$ROOT_DIR/build/ios/export"
EXPORT_OPTIONS="$ROOT_DIR/ios/ExportOptions.plist"

cd "$ROOT_DIR"

if [[ ! -d "$IOS_DIR/Pods" ]]; then
  echo "Installing CocoaPods..."
  (cd "$IOS_DIR" && pod install)
fi

mkdir -p "$ROOT_DIR/build/ios"

echo "Archiving iOS app..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  archive

if [[ ! -f "$EXPORT_OPTIONS" ]]; then
  echo
  echo "Archive created:"
  echo "  $ARCHIVE_PATH"
  echo
  echo "Next: open Xcode → Window → Organizer → Distribute App"
  echo "Or create ios/ExportOptions.plist and re-run to export an IPA automatically."
  exit 0
fi

echo "Exporting IPA..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo
echo "IPA exported to:"
echo "  $EXPORT_PATH"
