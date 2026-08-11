import { appGet, appSet, listVaultMetas, loadVaultMeta, saveVaultMeta } from "../storage/repo";
import { createVault, unlockVault, changePassphrase, type VaultKind } from "../crypto/vault";
import type { KdfParams } from "../crypto/kdf";

/** Test-only hook to use light KDF params. Undefined in production. */
let kdfOverride: Partial<Omit<KdfParams, "saltB64">> | undefined;
export function _setKdfOverrideForTests(o: typeof kdfOverride): void {
  kdfOverride = o;
}

/**
 * Authentication + rate limiting. A single passphrase prompt determines which
 * vault (if any) is unlocked: we try the entered passphrase against every known
 * vault and open the one whose wrapped DEK it decrypts. Because each vault has
 * its own salt + wrapped key, unlocking one reveals nothing about the other.
 */

interface RateState {
  failures: number;
  lockedUntil: number; // epoch ms
}

const RATE_KEY = "auth.rate";
const MAX_FREE_ATTEMPTS = 5;

async function getRate(): Promise<RateState> {
  return (await appGet<RateState>(RATE_KEY)) ?? { failures: 0, lockedUntil: 0 };
}

/** Backoff after too many failures: 5s, 15s, 60s, 5m, capped at 15m. */
function backoffMs(failures: number): number {
  const over = failures - MAX_FREE_ATTEMPTS;
  if (over <= 0) return 0;
  const ladder = [5_000, 15_000, 60_000, 300_000, 900_000];
  return ladder[Math.min(over - 1, ladder.length - 1)];
}

export interface UnlockResult {
  ok: boolean;
  kind?: VaultKind;
  dek?: CryptoKey;
  /** ms the caller must wait before the next attempt (rate limited). */
  retryInMs?: number;
}

export async function unlockAttempt(
  passphrase: string,
  now = Date.now(),
): Promise<UnlockResult> {
  const rate = await getRate();
  if (rate.lockedUntil > now) {
    return { ok: false, retryInMs: rate.lockedUntil - now };
  }

  const metas = await listVaultMetas();
  for (const meta of metas) {
    const dek = await unlockVault(meta, passphrase);
    if (dek) {
      await appSet<RateState>(RATE_KEY, { failures: 0, lockedUntil: 0 });
      return { ok: true, kind: meta.kind, dek };
    }
  }

  const failures = rate.failures + 1;
  const wait = backoffMs(failures);
  await appSet<RateState>(RATE_KEY, {
    failures,
    lockedUntil: wait > 0 ? now + wait : 0,
  });
  return { ok: false, retryInMs: wait > 0 ? wait : undefined };
}

export async function vaultExists(kind: VaultKind): Promise<boolean> {
  return (await loadVaultMeta(kind)) !== undefined;
}

export async function anyVaultExists(): Promise<boolean> {
  return (await listVaultMetas()).length > 0;
}

/**
 * Provision a vault. Guard against reusing a passphrase that already opens a
 * different vault — otherwise unlock would be ambiguous and one passphrase
 * could unexpectedly expose the "wrong" vault.
 */
export async function provisionVault(
  kind: VaultKind,
  passphrase: string,
): Promise<{ ok: boolean; error?: string; dek?: CryptoKey }> {
  if (await vaultExists(kind)) {
    return { ok: false, error: "vault-exists" };
  }
  for (const meta of await listVaultMetas()) {
    if (await unlockVault(meta, passphrase)) {
      return { ok: false, error: "passphrase-collision" };
    }
  }
  const { meta, dek } = await createVault(kind, passphrase, kdfOverride);
  await saveVaultMeta(meta);
  return { ok: true, dek };
}

export async function updatePassphrase(
  kind: VaultKind,
  oldPassphrase: string,
  newPassphrase: string,
): Promise<boolean> {
  const meta = await loadVaultMeta(kind);
  if (!meta) return false;
  const next = await changePassphrase(meta, oldPassphrase, newPassphrase, kdfOverride);
  if (!next) return false;
  await saveVaultMeta(next);
  return true;
}
