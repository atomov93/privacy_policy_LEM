# AGENTS.md

## Cursor Cloud specific instructions

### Repository layout (important: content differs by branch)

This repository holds two separate deliverables split across git branches — it is **not** a monorepo:

- **`main` (default branch, what you are usually on):** a **static GitHub Pages site** — just `index.html` (a Termly-generated privacy policy for the *LetsEncryptMessages* / LetsMessageEncrypt mobile app) plus `CNAME` (`privacy.tomovtechsolutions.com`). There is **no build step, no package manager, and no dependencies**.
- **`prod`:** the actual product — a **React Native (bare CLI) mobile app**. It has its own `package.json`, `package-lock.json`, and native iOS/Android projects. Working on the app requires checking out `prod` and using Node/npm + the React Native toolchain (Metro, Android SDK / Xcode). None of that tooling is needed for `main`.

### Running the static site (`main`) in development

No install is required. Serve the repo root over HTTP and open it:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. The page shows a "PRIVACY POLICY" heading, a "SUMMARY OF KEY POINTS" section, and a "TABLE OF CONTENTS" with in-page anchor links (e.g. `#privacyrights`, `#contact`).

Notes:
- There is nothing to lint, test, or build on `main` — it is a single hand-generated HTML file. Validation = serve it and confirm it renders / anchors navigate.
- The table-of-contents anchor links land slightly off-center (the target heading may not sit exactly at the top of the viewport). This is a pre-existing quirk of the Termly-generated HTML (many empty `<bdt>` layout wrappers), **not** an environment problem. Do not "fix" it unless explicitly asked.

### Working on the mobile app (`prod`)

Switch branches (`git checkout prod`) to access the app. Standard React Native workflow: `npm install`, then `npm start` (Metro) plus `npm run android` / `npm run ios`; headless checks are `npm test`, `npm run typecheck`, `npm run lint` (mirrors `.github/workflows/ci.yml`, which runs on Node 22 with no emulator). Running the app on a device/simulator requires the native Android/iOS toolchains, which are not provisioned by the `main` environment.
