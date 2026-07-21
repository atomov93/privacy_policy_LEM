# LetsMessageEncrypt

A React Native CLI app for encrypting and decrypting messages between devices using pre-shared secrets. Keys are identified by human-readable names. Fingerprints use **SHA-256** so both sides can verify they share the same secret.

## Features

- **Create / import keys** — name + passphrase, with optional auto-generated secrets
- **SHA-256 fingerprint** — displayed for each key so you can verify pre-shared setup
- **Authenticated encryption** — PBKDF2-SHA256, AES-256-CBC, random IV/salt, HMAC-SHA256 (`v3:` ciphertext)
- **Secure local storage** — key database encrypted with a Keychain/Keystore-backed wrapping key
- **PIN-protected QR transfer** — secrets are never encoded as plaintext in QR codes
- **Encrypted `.lme` key files** — share keys remotely; passphrase required separately
- **Biometric / screen lock** — fails closed when authentication is unavailable
- **Two tabs** — Keys (manage) and Encrypt (encrypt/decrypt messages)

## Prerequisites

- Node.js >= 22.11
- For iOS: Xcode, CocoaPods (`sudo gem install cocoapods`)
- For Android: Android Studio, JDK, Android SDK

## Setup

```bash
cd LetsEncryptApp
npm install
```

### iOS

```bash
cd ios
bundle install        # first time only
bundle exec pod install
cd ..
npx react-native run-ios
```

### Android

Start an emulator or connect a device, then:

```bash
npx react-native run-android
```

### Metro bundler

```bash
npm start
```

## How the encrypt/decrypt flow works

### 1. Device A creates a key

1. Open the **Keys** tab.
2. Enter a name and a secret (or tap **Generate**).
3. Tap **Save key**.
4. Share either the **secret**, the **SHA-256 fingerprint**, or a **PIN-protected QR**.

### 2. Device B imports the same key

1. Open the **Keys** tab → Join key.
2. Scan the QR and enter the transfer PIN, or enter name + secret + fingerprint manually.
3. Compare fingerprints — they must match.

### 3. Encrypt / decrypt

1. Open the **Encrypt** tab and select the key.
2. Encrypt produces `v3:` authenticated ciphertext.
3. Decrypt accepts `v3:` and older `v2:` ciphertext. Unauthenticated legacy MD5/AES-CBC is **off by default** and requires an explicit “Legacy decrypt (insecure)” toggle.

## Cryptography details

See [docs/CRYPTO.md](docs/CRYPTO.md) for the full format specification.

| Step | Method |
|------|--------|
| Fingerprint | `SHA-256(secret)` → 64-char hex |
| Message KDF (v3) | PBKDF2-SHA256, 100 000 iterations, **per-message random salt** |
| Encryption | AES-256-CBC + PKCS7, random IV |
| Integrity | HMAC-SHA256 over `salt \|\| IV \|\| ciphertext` |
| Output | `v3:` + Base64 payload |
| Compatibility | Decrypts `v2:` (fixed app salt). Legacy MD5/CBC only with explicit opt-in |

> **Note:** Older documentation that described MD5-derived AES-128-CBC as the current scheme is obsolete. That algorithm remains available only as an explicitly labeled insecure compatibility mode.

## Project structure

```
LetsEncryptApp/
├── App.tsx
├── src/services/          # crypto, key storage, biometrics, QR, clipboard
├── src/components/        # UI tabs and modals
├── android/ / ios/        # native projects (FLAG_SECURE / privacy overlay)
├── docs/                  # privacy, crypto, threat model, release guide
└── __tests__/             # Jest security and regression suite
```

## Tests

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
```

## Security

See [SECURITY.md](SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md). Report vulnerabilities privately to the address listed in SECURITY.md.
