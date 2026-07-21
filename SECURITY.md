# Security Policy

## Supported versions

Security fixes are applied to the latest release line of LetsMessageEncrypt.

## Reporting a vulnerability

Email the publisher/support address listed on the App Store or Google Play listing for LetsMessageEncrypt. Include steps to reproduce, affected platform/version, and impact. Do not open a public GitHub issue for exploitable flaws.

## Cryptography

See [docs/CRYPTO.md](docs/CRYPTO.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Dependency advisories

Moderate-severity transitive advisories (for example in the React Native CLI toolchain such as `fast-xml-parser`) are tracked deliberately. Prefer version bumps and `overrides` over `npm audit fix --force`, which can break the RN toolchain.

Known residual risk after hardening: transitive CLI tooling advisories that do not ship in the production app binary. Current `overrides` pin `fast-xml-parser` ≥5.7.0; `npm audit` should report zero vulnerabilities after install.

## Repository hygiene

If Xcode Organizer export folders or `Packaging.log` files were ever committed, they may remain in Git history after deletion from the working tree. Purge them with `git filter-repo` (or BFG) only when you are ready for a history rewrite and coordinated force-push.
