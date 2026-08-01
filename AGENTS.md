# AGENTS.md

## Cursor Cloud specific instructions

### What this branch is

`prod` holds the **LetsMessageEncrypt** app — a React Native 0.86 (bare CLI, not Expo) mobile app for offline message encryption/decryption. There is **no backend**: all crypto, key storage, and persistence happen on-device. Requires Node `>= 22.11` (see `engines` in `package.json`); the environment ships Node 22.x.

> Note: the repo's other branch (`main`) is just a static GitHub Pages privacy-policy page and is unrelated to app development.

### Dev loop (all commands run from repo root)

Standard scripts are defined in `package.json` and mirror `.github/workflows/ci.yml` (Node 22: `npm ci` → `typecheck` → `lint` → `test:coverage`):

- `npm run typecheck` — `tsc --noEmit` (currently clean).
- `npm test` / `npm run test:coverage` — Jest suite under `__tests__/`. Uses `jest.setup.js` to mock native modules. Note: the full run takes a couple of minutes (`__tests__/lmeFile.test.ts` and the PBKDF2-heavy crypto tests are slow — the crypto tests derive keys with 100k PBKDF2 iterations, so multi-second per-test durations are expected, not a hang).
- `npm run lint` — ESLint.
- `npm start` — Metro dev server (see below).

### Running the app in this VM (headless)

No Android emulator or iOS simulator is provisioned, and running on a device needs the native toolchains (Android SDK / Xcode + CocoaPods) which are **not** installed here. So `npm run android` / `npm run ios` will not work in the cloud VM.

The available "run in dev mode" surface is the **Metro bundler**. Start it and verify it compiles the app JS end-to-end without any device:

```
npm start                     # or: npm start -- --port 8081
# then, in another shell:
curl -s "http://localhost:8081/status"                                             # -> packager-status:running
curl -s -o /tmp/app.bundle "http://localhost:8081/index.bundle?platform=android&dev=true&minify=false"
```

A successful `index.bundle` request (HTTP 200, multi-MB output, Metro logs `BUNDLE ./index.js`) confirms the whole app graph transforms/bundles correctly — this is the practical headless smoke test.

### Known pre-existing failures (not environment issues — do not chase)

On a clean `prod` checkout the CI-style checks are already red; these are repo/code issues, not setup problems:

- `npm run lint` reports errors (e.g. an unused `deriveKeysWithCryptoJs` in `src/services/cryptoService.ts`, plus many `no-bitwise` warnings).
- One Jest test fails: `__tests__/App.test.tsx` › "tutorial shows welcome step and completes". `OnboardingTutorial` renders inside a `SafeAreaProvider`, but `react-native-safe-area-context` is not mocked in `jest.setup.js`, so `react-test-renderer` yields an empty provider (`children: null`) and the tutorial text never renders. All 132 other tests pass, including the full crypto/security/storage suites.

Don't "fix" these as part of environment work — only address them if a task explicitly asks.
