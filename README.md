# LetsMessageEncrypt

A React Native CLI app for encrypting and decrypting messages between app instances using pre-shared secrets. Keys are identified by human-readable names, and the MD5 hash of each secret acts as a fingerprint you can share to verify both sides match.

## Features

- **Create / import keys** — name + passphrase, with optional auto-generated secrets
- **MD5 fingerprint** — displayed for each key so you can verify pre-shared setup
- **AES encryption** — messages encrypted with AES-128-CBC, key derived from MD5(secret)
- **Local storage** — keys persisted on device via AsyncStorage
- **Two tabs** — Keys (manage) and Encrypt (encrypt/decrypt messages)

## Prerequisites

- Node.js >= 22.11
- For iOS: Xcode, CocoaPods (`sudo gem install cocoapods`)
- For Android: Android Studio, JDK, Android SDK

## Setup

```bash
cd LetsMessageEncrypt
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

If Metro is not already running:

```bash
npm start
```

## How the encrypt/decrypt flow works

### 1. Device A creates a key

1. Open the **Keys** tab.
2. Enter a name (e.g. `Dominic`) and a secret (or tap **Generate secret**).
3. Tap **Save key**.
4. Share either:
   - the **secret** (passphrase), or
   - the **MD5 hash** (fingerprint) so Device B can confirm they match after import.

### 2. Device B imports the same key

1. Open the **Keys** tab.
2. Enter the **same name** and **same secret** as Device A.
3. Tap **Save key**.
4. Compare MD5 hashes — they must be identical.

### 3. Encrypt on Device A

1. Open the **Encrypt** tab and select the key.
2. Type a message and tap **Encrypt**.
3. Copy the base64 ciphertext and send it to Device B (SMS, chat, email, etc.).

### 4. Decrypt on Device B

1. Open the **Encrypt** tab and select the matching key.
2. Paste the ciphertext and tap **Decrypt**.
3. The original plaintext appears.

## Cryptography details

| Step | Method |
|------|--------|
| Fingerprint | `MD5(secret)` → 32-char hex string |
| AES key | `MD5(secret)` as 128-bit key material |
| IV | `MD5(secret + ":iv")` (deterministic, same on both devices) |
| Mode | AES-128-CBC with PKCS7 padding |
| Output | Raw ciphertext encoded as base64 |

Both instances derive identical key material from the same secret, so ciphertext produced on one device decrypts on the other without transmitting an IV separately.

> **Note:** MD5 is used here as requested for fingerprinting and key derivation. For production security, prefer modern KDFs (e.g. PBKDF2, Argon2) and SHA-256+.

## Project structure

```
LetsMessageEncrypt/
├── App.tsx                          # Root app with tab navigation
├── src/
│   ├── types.ts                     # SavedKey type
│   ├── services/
│   │   ├── cryptoService.ts         # MD5, AES encrypt/decrypt
│   │   └── keyStorage.ts            # AsyncStorage persistence
│   └── components/
│       ├── CreateKeyTab.tsx         # Key creation & list
│       └── EncryptDecryptTab.tsx    # Encrypt/decrypt UI
├── android/                         # Android native project
├── ios/                             # iOS native project
└── __tests__/                       # Unit tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator/device |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

## Tests

```bash
npm test
```

Tests cover MD5 fingerprint stability and round-trip encrypt/decrypt behavior.
