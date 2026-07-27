# Cryptographic format specification — LetsMessageEncrypt

## Fingerprints

- Current: `SHA-256(utf8(secret))` hex (64 chars).
- Import verification also accepts a 32-char MD5 hex for legacy fingerprints only.

## Message ciphertext

### v4 (current encrypt output)

```
v4: Base64( salt[16] || iv[16] || ciphertext || hmac[32] )
```

- Master KDF (once per secret, cached): PBKDF2-HMAC-SHA256(secret, `"lets-encrypt-app:v4"`, iterations=100000, dkLen=64)
- Per-message keys: HKDF-SHA256(ikm=master, salt=message_salt, info=`"lets-encrypt-app:v4:msg"`, length=64)
- Split derived key: encKey = first 32 bytes, macKey = last 32 bytes
- AES-256-CBC PKCS7 with random IV
- HMAC-SHA256(macKey, salt || iv || ciphertext), compared in constant time

This keeps the same password-stretching strength as v3 while avoiding 100 000 PBKDF2 iterations on every encrypt/decrypt.

### v3 (decrypt compatibility)

```
v3: Base64( salt[16] || iv[16] || ciphertext || hmac[32] )
```

- KDF: PBKDF2-HMAC-SHA256(secret, salt, iterations=100000, dkLen=64)
- Split derived key: encKey = first 32 bytes, macKey = last 32 bytes
- AES-256-CBC PKCS7 with random IV
- HMAC-SHA256(macKey, salt || iv || ciphertext), compared in constant time

### v2 (decrypt compatibility)

```
v2: Base64( iv[16] || ciphertext || hmac[32] )
```

- KDF salt is the fixed UTF-8 string `lets-encrypt-app:v2` (100000 iterations)
- Same AES-256-CBC + HMAC construction without per-message salt

### Legacy (insecure, opt-in only)

Unauthenticated AES-128-CBC with `MD5(secret)` as key and `MD5(secret + ":iv")` as IV.
Enabled only when the UI “Legacy decrypt (insecure)” toggle is on (`allowLegacy: true`).

## Key database at rest

- AsyncStorage key `@lets_encrypt_app/keys_enc` holds `db1:` + Base64(iv || ciphertext || hmac)
- Wrapping key (64 random bytes, hex) stored in Keychain/Keystore service `lets-encrypt-app.db-wrap-key`, accessibility `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- Legacy plaintext `@lets_encrypt_app/keys` is migrated once then deleted

## QR transfer (v2)

```
JSON { "v": 2, "salt": hex, "exp": epochMs, "data": "<db1 payload without prefix>" }
```

- Inner JSON `{name, secret}` sealed with `encryptWithRawKey` under PBKDF2(pin, salt, 50000)
- 6-digit transfer PIN shown once on export; TTL ≈ 5 minutes
- Plaintext QR `v:1` is rejected
- Max encoded payload length: 4096 bytes; names reject C0 control characters

## `.lme` encrypted key file (remote transfer)

```
LME1
{ "v": 1, "fmt": "letsmessageencrypt.key", "kdf": "pbkdf2-sha256",
  "iters": 200000, "salt": hex, "exp": epochMs, "data": "<sealed without db1:>" }
```

- Extension: `.lme`
- MIME: `application/vnd.letsmessageencrypt.lme`
- Inner JSON `{name, secret, fingerprint}` sealed with AES-256-CBC + HMAC under PBKDF2-SHA256 (200 000 iterations) of a **separate transfer passphrase** (min 10 chars; auto-generated 20-char secrets by default)
- Default expiry: 7 days
- The file does **not** contain the passphrase. Without the passphrase, ciphertext cannot be recovered — including by someone who only has the app binary
- OS associations open `.lme` files in LetsMessageEncrypt; encryption (not the extension) provides confidentiality
