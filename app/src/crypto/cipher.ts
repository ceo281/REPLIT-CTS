import { base64ToBytes, bytesToBase64, randomBytes } from "./bytes";

/**
 * Authenticated encryption using AES-256-GCM (WebCrypto SubtleCrypto).
 * GCM provides confidentiality AND integrity: any tampering with the ciphertext
 * or associated data causes decryption to throw, which is how we detect a
 * modified/corrupted database and a wrong key.
 */

export const IV_LENGTH = 12; // 96-bit nonce, the standard for AES-GCM

export interface Sealed {
  iv: string; // base64
  ct: string; // base64 ciphertext (includes GCM tag)
}

export async function importRawKey(
  raw: Uint8Array,
  usages: KeyUsage[],
  extractable = false,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, extractable, usages);
}

export function generateDataKeyBytes(): Uint8Array {
  return randomBytes(32); // 256-bit random data-encryption-key
}

/**
 * Seal plaintext bytes under `key`. A fresh random 96-bit IV is generated for
 * every call — never reuse an (key, iv) pair with GCM. `aad` (associated data)
 * is authenticated but not encrypted; we bind records to their id/type so a
 * ciphertext cannot be silently moved to a different record slot.
 */
export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): Promise<Sealed> {
  const iv = randomBytes(IV_LENGTH);
  const params: AesGcmParams = { name: "AES-GCM", iv };
  if (aad) params.additionalData = aad;
  const ct = await crypto.subtle.encrypt(params, key, plaintext);
  return { iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
}

/**
 * Open a sealed blob. Throws if the key is wrong, the IV is wrong, the AAD does
 * not match, or the ciphertext/tag has been tampered with.
 */
export async function open(
  key: CryptoKey,
  sealed: Sealed,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  const iv = base64ToBytes(sealed.iv);
  const ct = base64ToBytes(sealed.ct);
  const params: AesGcmParams = { name: "AES-GCM", iv };
  if (aad) params.additionalData = aad;
  const pt = await crypto.subtle.decrypt(params, key, ct);
  return new Uint8Array(pt);
}
