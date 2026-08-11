import { bytesToBase64, utf8ToBytes, wipe } from "./bytes";
import { open, seal, importRawKey, generateDataKeyBytes, type Sealed } from "./cipher";
import { DEFAULT_KDF, deriveKek, newSalt, type KdfParams } from "./kdf";

export type VaultKind = "finance" | "private";

/**
 * Persisted, non-secret metadata for one vault. This is the ONLY vault-related
 * data written to storage in the clear. It contains:
 *   - the KDF parameters + salt (public by design)
 *   - the data-encryption-key wrapped (encrypted) under the passphrase-derived
 *     key. Without the passphrase the wrapped DEK is opaque ciphertext.
 * It contains no record data and no usable key material.
 */
export interface VaultMeta {
  id: string;
  kind: VaultKind;
  version: number;
  createdAt: number;
  kdf: KdfParams;
  wrappedDek: Sealed;
  /** Optional device-bound re-wrap of the DEK for biometric / quick unlock. */
  deviceWrappedDek?: Sealed;
}

/** Associated-data label so a wrapped DEK can't be swapped between vaults. */
function wrapAad(kind: VaultKind): Uint8Array {
  return utf8ToBytes(`dvl:wrap:${kind}`);
}

/**
 * Create a brand new vault. Generates a random 256-bit DEK, derives a KEK from
 * the passphrase via Argon2id, and stores the DEK wrapped under the KEK.
 * Returns the metadata to persist plus the live (non-extractable) DEK to use
 * for the current session. The raw KEK and DEK bytes are wiped before return.
 */
export async function createVault(
  kind: VaultKind,
  passphrase: string,
  kdfOverride?: Partial<Omit<KdfParams, "saltB64">>,
): Promise<{ meta: VaultMeta; dek: CryptoKey }> {
  const kdf: KdfParams = { ...DEFAULT_KDF, ...kdfOverride, saltB64: bytesToBase64(newSalt()) };
  const kekBytes = await deriveKek(passphrase, kdf);
  const dekBytes = generateDataKeyBytes();
  try {
    const kek = await importRawKey(kekBytes, ["encrypt"], false);
    const wrappedDek = await seal(kek, dekBytes, wrapAad(kind));
    const dek = await importRawKey(dekBytes, ["encrypt", "decrypt"], false);
    const meta: VaultMeta = {
      id: crypto.randomUUID(),
      kind,
      version: 1,
      createdAt: Date.now(),
      kdf,
      wrappedDek,
    };
    return { meta, dek };
  } finally {
    wipe(kekBytes, dekBytes);
  }
}

/**
 * Attempt to unlock a vault with a passphrase. Returns the live DEK on success.
 * Returns null on an authentication failure (wrong passphrase) — GCM's integrity
 * check makes a wrong key indistinguishable from tampering, so we surface it as
 * a generic failure without revealing which.
 */
export async function unlockVault(
  meta: VaultMeta,
  passphrase: string,
): Promise<CryptoKey | null> {
  const kekBytes = await deriveKek(passphrase, meta.kdf);
  let dekBytes: Uint8Array | null = null;
  try {
    const kek = await importRawKey(kekBytes, ["decrypt"], false);
    try {
      dekBytes = await open(kek, meta.wrappedDek, wrapAad(meta.kind));
    } catch {
      return null; // wrong passphrase or tampered wrap
    }
    return await importRawKey(dekBytes, ["encrypt", "decrypt"], false);
  } finally {
    wipe(kekBytes, dekBytes);
  }
}

/**
 * Re-wrap the DEK under a new passphrase without changing the DEK itself, so
 * existing encrypted records remain valid. Requires the old passphrase.
 */
export async function changePassphrase(
  meta: VaultMeta,
  oldPassphrase: string,
  newPassphrase: string,
  kdfOverride?: Partial<Omit<KdfParams, "saltB64">>,
): Promise<VaultMeta | null> {
  const kekOld = await deriveKek(oldPassphrase, meta.kdf);
  let dekBytes: Uint8Array | null = null;
  try {
    const kekOldKey = await importRawKey(kekOld, ["decrypt"], false);
    try {
      dekBytes = await open(kekOldKey, meta.wrappedDek, wrapAad(meta.kind));
    } catch {
      return null;
    }
    const kdf: KdfParams = { ...DEFAULT_KDF, ...kdfOverride, saltB64: bytesToBase64(newSalt()) };
    const kekNew = await deriveKek(newPassphrase, kdf);
    try {
      const kekNewKey = await importRawKey(kekNew, ["encrypt"], false);
      const wrappedDek = await seal(kekNewKey, dekBytes, wrapAad(meta.kind));
      return { ...meta, kdf, wrappedDek, deviceWrappedDek: undefined };
    } finally {
      wipe(kekNew);
    }
  } finally {
    wipe(kekOld, dekBytes);
  }
}
