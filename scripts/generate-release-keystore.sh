#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
APP_DIR="$ANDROID_DIR/app"
KEYSTORE_FILE="$APP_DIR/release.keystore"
PROPS_FILE="$ANDROID_DIR/keystore.properties"
EXAMPLE_FILE="$ANDROID_DIR/keystore.properties.example"

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "Release keystore already exists at:"
  echo "  $KEYSTORE_FILE"
  exit 0
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool not found. Install a JDK (Android Studio includes one)."
  echo "Then run: npm run android:keystore"
  exit 1
fi

echo "Create a release keystore for Google Play signing."
echo "Use a strong password and store it safely — you cannot recover a lost keystore."
echo

read -r -s -p "Keystore password: " STORE_PASSWORD
echo
read -r -s -p "Confirm password: " STORE_PASSWORD_CONFIRM
echo

if [[ "$STORE_PASSWORD" != "$STORE_PASSWORD_CONFIRM" ]]; then
  echo "Passwords do not match."
  exit 1
fi

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE_FILE" \
  -alias letsmessageencrypt-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASSWORD" \
  -keypass "$STORE_PASSWORD" \
  -dname "CN=LetsMessageEncrypt, OU=Mobile, O=LetsMessageEncrypt, L=Unknown, ST=Unknown, C=US"

cp "$EXAMPLE_FILE" "$PROPS_FILE"
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' "s/YOUR_STORE_PASSWORD/$STORE_PASSWORD/g" "$PROPS_FILE"
  sed -i '' "s/YOUR_KEY_PASSWORD/$STORE_PASSWORD/g" "$PROPS_FILE"
else
  sed -i "s/YOUR_STORE_PASSWORD/$STORE_PASSWORD/g" "$PROPS_FILE"
  sed -i "s/YOUR_KEY_PASSWORD/$STORE_PASSWORD/g" "$PROPS_FILE"
fi

echo
echo "Created:"
echo "  $KEYSTORE_FILE"
echo "  $PROPS_FILE"
echo
echo "Back up both files somewhere secure (password manager + offline copy)."
echo "Google Play requires the same signing key for all future updates."
