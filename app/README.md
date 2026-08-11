# Ledger — Secure Dual-Vault Finance & People Ledger

A mobile-first PWA that works as a genuine personal finance / ledger app, while
providing a second, **independently-encrypted** private workspace. The two
workspaces use **separate encryption keys** — unlocking one does not decrypt the
other.

The appearance is *not* the security mechanism. Protection comes from strong
password stretching (Argon2id), authenticated encryption (AES-256-GCM), random
per-vault keys, encrypted local storage, automatic locking, and controlled
exports/backups. See **[SECURITY.md](./SECURITY.md)** for the full threat model
and its limits.

## What it does

**Finance vault** (the ordinary, legitimate app)
- Accounts with derived balances, total balance
- Income / expense / sale transactions with categories, quantities, notes
- Monthly budgets with progress tracking
- Reports: period totals, 6-month cashflow chart, category breakdown

**Private vault**
- Searchable people list; each person has a full chronological history
- Records: date/time, type, quantity, amount, occurrence/event, notes
- Per-person totals and **running totals**, all derived from records
- Overall dashboard: people/records/quantity/occurrence totals, period totals
- Records explorer with filters (person, type, date range, quantity, amount, text)
- Custom record types

**Shared**
- Passphrase onboarding + lock screen with rate-limit backoff
- Auto-lock (inactivity, background, external-device connect), privacy shield
- Controlled exports: full / finance / summary / anonymized
- Encrypted backup + restore (separate backup key)
- Change passphrase, add the private vault, dark / light / system themes

## Running it

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm test           # unit/integration tests (crypto, vaults, calc, backup)
```

End-to-end and screenshots (headless Chromium):

```bash
npm run build && npm run preview &   # serve on :4173
node scripts/smoke.mjs               # full onboarding→two-vault flow
node scripts/screenshots.mjs         # writes scripts/shots/*.png
```

## How it maps to the requested phases

- **Phase 1 — Core app:** finance dashboard, people, records, sales, quantities,
  occurrences, running totals, search/filter. ✅
- **Phase 2 — Security:** separate authentication, separate encrypted vaults,
  Argon2id KDF, random wrapped DEKs, auto-lock. ✅ (biometric + hardware keystore
  = roadmap, see below)
- **Phase 3 — Data protection:** encrypted backups, controlled + anonymized
  exports, restore. ✅ (remote lost-device controls = roadmap)
- **Phase 4 — Interface:** professional finance look, charts, reports, custom
  record types, dark/light themes, mobile nav. ✅
- **Phase 5 — Security testing:** automated tests for extraction, bypass, tamper,
  backup exposure, rate limiting, plus a manual checklist in SECURITY.md. ✅ /
  partial (see checklist).

## Architecture

```
src/
  crypto/     bytes, Argon2id KDF, AES-256-GCM cipher, vault key wrapping
  storage/    IndexedDB schema (ciphertext only) + encrypt/decrypt repository
  session/    auth (routing + rate limit), settings, React session + auto-lock
  finance/    types, api (CRUD), calc (balances/totals/budgets), pages
  people/     types, api, calc (running/overall totals, filters), pages
  exports/    controlled exporters + encrypted backup/restore
  ui/         formatting, icons, shared components, hooks
  pages/      onboarding, lock screen, settings, tab bar
tests/        crypto, vault/auth, calc, backup
scripts/      smoke.mjs (E2E), screenshots.mjs
```

Data flow for totals: **Person → Records → per-person totals → overall totals →
reports.** Nothing is stored as a total; it is always computed from records so
history and totals can never disagree.

## Roadmap to a hardened native build

This PWA delivers real cryptography that runs and is testable today, but a web
runtime cannot bind keys to device hardware. The intended production path:

- Wrap in a native shell (React Native / Capacitor) and store the wrapped DEK or
  a device key in **iOS Keychain/Secure Enclave** and **Android
  Keystore/StrongBox**, gated by **biometrics**.
- Use OS USB/MTP signals for real "computer connected" locking.
- Add remote lost-device revocation and a hidden-volume option for deniability.

Until then, treat the security guarantees as those stated in SECURITY.md — no
more.
