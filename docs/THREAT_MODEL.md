# Threat model — LetsMessageEncrypt

## Assets

- Pre-shared secrets and derived message keys
- Plaintext messages while displayed or copied
- Key fingerprints and QR transfer PINs

## In scope adversaries

- Casual access to an unlocked phone (mitigated by biometric/screen lock that fails closed)
- App-switcher screenshots / screen recording (FLAG_SECURE on Android; privacy overlay on iOS)
- Forensic or backup extraction of app sandbox storage (keys encrypted with Keychain/Keystore wrapping key; wrapping key is device-bound)
- Accidental sharing of QR codes (PIN + expiry; no plaintext secret in QR)
- Clipboard snooping after copy (auto-clear after ~45s; still best-effort)

## Out of scope / residual risks

- Compromised OS or malware with accessibility / keylogging privileges
- User photographing the transfer PIN or revealing secrets verbally
- Coercion / unlocked device with successful biometric auth
- Advanced memory scraping of process RAM while the app is unlocked
- Git history of this repository if distribution logs were ever committed (rewrite separately)

## Trust boundaries

- No cloud sync; no analytics; offline-first encrypt/decrypt
- Camera used only for QR import
- Internet permission is debug-only on Android
