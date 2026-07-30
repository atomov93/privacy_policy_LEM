# Store release guide — LetsMessageEncrypt

Release checklist for **Google Play** and **Apple App Store**.

## App identity

| Field | Value |
|-------|--------|
| App name | LetsMessageEncrypt |
| Android package | `com.letsmessageencrypt` |
| iOS bundle ID | `org.tts.LetsMessageEncrypt` |
| Version | 1.4.0 (Android versionCode 5) |
| Category | Productivity / Utilities |

> **Trademark note:** Avoid confusion with the “Let’s Encrypt” certificate authority. This app is a separate offline messaging encryptor named LetsMessageEncrypt.

---

## Before you start

You need:

1. **Google Play Developer account** — [play.google.com/console](https://play.google.com/console) ($25 one-time)
2. **Apple Developer Program** — [developer.apple.com](https://developer.apple.com) ($99/year)
3. **Privacy policy URL** — host `docs/PRIVACY_POLICY.md` publicly (required by both stores)
4. **Store assets** — screenshots, short description, feature graphic (Play), app icon 1024×1024 (App Store)

---

## 1. Android — Google Play

### Step A: Create release keystore (one time)

```bash
cd LetsMessageEncrypt
chmod +x scripts/*.sh
npm run android:keystore
```

Back up `android/app/release.keystore` and `android/keystore.properties` securely. **Losing the keystore means you cannot update the app on Play.**

### Step B: Build the App Bundle (AAB)

Google Play requires **AAB**, not APK:

```bash
npm run android:release
```

Output:

```
android/app/build/outputs/bundle/release/app-release.aab
```

### Step C: Google Play Console

1. **Create app** → name “LetsMessageEncrypt” → default language → app/game → free.
2. **Dashboard** → complete required tasks:
   - **App access** — “All functionality is available without special access”
   - **Ads** — No ads
   - **Content rating** — fill questionnaire (likely Everyone / low maturity)
   - **Target audience** — adults; not designed for children
   - **News app** — No
   - **COVID-19** — No
   - **Data safety** — declare:
     - Data collected: **None** (or “data stored on device only, not collected by developer”)
     - Encryption in transit: N/A (no server)
     - Users can request deletion: uninstall app
   - **Privacy policy** — paste your hosted URL
   - **Store listing** — description, screenshots, icon
3. **Release → Production → Create new release**
4. Upload `app-release.aab`
5. **Release name:** 1.0.1
6. Submit for review

### Play signing

On first upload, Google will offer **Play App Signing**. Accept it — Google holds the app signing key; you keep the upload key (`release.keystore`).

---

## 2. iOS — App Store

Your Xcode project is already set to:

- Team: `J5Q2Q8AJ75`
- Bundle ID: `org.tts.LetsMessageEncrypt`
- Automatic signing

### Step A: App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → New App
2. Platform: iOS  
   Name: LetsMessageEncrypt  
   Bundle ID: `org.tts.LetsMessageEncrypt`  
   SKU: e.g. `lets-encrypt-ios-001`
3. **App Information**
   - Category: Productivity
   - Privacy Policy URL: your hosted policy
4. **Pricing** → Free

### Step B: Archive and upload

**Option 1 — Xcode (recommended first time)**

```bash
cd LetsMessageEncrypt/ios && pod install && cd ..
open ios/LetsMessageEncrypt.xcworkspace
```

In Xcode:

1. Select **Any iOS Device (arm64)** as destination (not a simulator)
2. **Product → Archive**
3. When Organizer opens → **Distribute App**
4. **App Store Connect** → Upload
5. Answer export compliance carefully against Apple’s **current** App Store Connect questionnaire. The app’s primary purpose includes cryptography; do not treat exemption as automatic. Re-verify `ITSAppUsesNonExemptEncryption` in Info.plist against Apple’s latest guidance before each submission.

**Option 2 — command line**

```bash
npm run ios:release
```

Then use Organizer or Transporter to upload the archive/IPA.

### Step C: App Store listing

In App Store Connect → your app → **1.0 Prepare for Submission**:

| Item | Guidance |
|------|----------|
| Screenshots | iPhone 6.7" and 6.5" required; iPad if supporting tablet |
| Description | Explain pre-shared key encrypt/decrypt, QR import, biometric lock |
| Keywords | encrypt, decrypt, privacy, keys, QR, secure messaging |
| Support URL | Your site or GitHub repo |
| Privacy nutrition labels | **Data Not Collected** |

### Step D: Submit

Add the uploaded build → complete **App Review Information** → **Submit for Review**.

---

## 3. Version bumps (future updates)

Edit both platforms before each release:

**Android** — `android/app/build.gradle`:

```gradle
versionCode 2        // integer, must increase every upload
versionName "1.0.1"  // user-visible version
```

**iOS** — Xcode → target → General:

- Version: `1.0.1` (MARKETING_VERSION)
- Build: `2` (CURRENT_PROJECT_VERSION)

Then rebuild and upload again.

---

## 4. Suggested store description (short)

**Subtitle / short description**

Encrypt and decrypt messages with keys you share offline.

**Full description**

LetsMessageEncrypt lets two people encrypt messages using a shared secret they agree on in person or over a trusted channel.

- Create named encryption keys or import via QR code
- Encrypt messages to base64 ciphertext you can paste anywhere
- Decrypt messages from another device using the same key
- Verify keys with SHA-256 fingerprints
- Optional Face ID, Touch ID, or screen lock

Keys and messages stay on your device. No account. No cloud.

---

## 5. Quick command reference

| Command | Purpose |
|---------|---------|
| `npm run android:keystore` | Generate Play upload keystore (once) |
| `npm run android:release` | Build signed AAB for Play |
| `npm run ios:release` | Archive iOS app for App Store |
| `npm test` | Run tests before release |

---

## 6. If review is rejected

Common fixes:

- **Missing privacy policy** → host `docs/PRIVACY_POLICY.md` and add URL
- **Encryption export** (iOS) → re-check Apple’s current questions; do not assume automatic exemption because encryption is a core feature
- **Camera permission** → already declared in Info.plist / Android manifest
- **Name confusion with Let’s Encrypt CA** → clarify in review notes or rename listing

Add review notes example:

> This app (LetsMessageEncrypt) is an offline pre-shared-key message encryptor. It is not affiliated with the Let's Encrypt certificate authority. Users create keys locally; no server receives user data.
