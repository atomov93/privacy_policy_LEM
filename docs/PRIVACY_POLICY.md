# Privacy Policy — LetsMessageEncrypt

**Last updated:** July 22, 2026

## Overview

LetsMessageEncrypt is a mobile app for encrypting and decrypting messages using pre-shared keys that you create or import. The app is designed to keep your keys and messages on your device. It does not operate accounts or cloud sync.

## Data we collect

**We do not collect, transmit, or sell your personal data.**

The app does not include analytics, advertising, accounts, or developer-operated cloud sync.

## Data stored on your device

The app stores the following locally:

- Key names you choose
- Passphrases / shared secrets for encryption
- Key fingerprints derived from those secrets
- App settings (for example, biometric lock preference and language)

Secrets in the key database are encrypted before being written to ordinary app storage. The encryption wrapping key is kept in the platform Keychain (iOS) or Keystore-backed secure storage (Android) and is intended to stay on that device.

This data remains on the device until you delete keys, clear app data, or uninstall. However, copies can leave the app when you:

- Copy text to the system clipboard (cleared automatically after a short delay when possible)
- Share text or QR codes through other apps
- Display a QR transfer (PIN-protected; still photographable)
- Use OS backup, screenshot, screen-recording, crash-diagnostic, or keyboard features outside our control

Android sets `FLAG_SECURE` to reduce app-switcher screenshots; iOS shows a privacy overlay when the app resigns active. These mitigations are not absolute against a compromised device or determined screen capture.

## Permissions

| Permission | Why it is used |
|------------|----------------|
| Camera | Scan QR codes to import keys shared from another device |
| Biometrics / screen lock | Optionally lock the app; unlock fails closed if authentication is unavailable |
| Internet | Not used by the core encrypt/decrypt flow. Release Android builds omit the INTERNET permission; debug builds may include it for Metro tooling. |

## Encryption

Messages are encrypted on your device before you copy or share ciphertext through any channel you choose. We do not operate servers that receive your plaintext, ciphertext, or secrets.

## Children

The app is not directed at children under 13, and we do not knowingly collect information from children.

## Changes

We may update this policy. The “Last updated” date at the top will change when we do.

## Contact

For privacy questions, contact: **support@letsmessageencrypt.example** (replace with your production support address before store submission), or use the support email on the App Store / Google Play listing.
