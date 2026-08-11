import { argon2idAsync } from "@noble/hashes/argon2";
import { randomBytes, utf8ToBytes, wipe } from "./bytes";

/**
 * Argon2id parameters. Argon2id is the modern, memory-hard password KDF
 * recommended by OWASP. Memory-hardness makes GPU/ASIC brute force of a stolen
 * database expensive per guess.
 *
 * `memKiB` is memory cost in KiB, `time` is iterations, `parallelism` is lanes.
 * These are stored alongside each vault so parameters can be raised over time
 * without invalidating existing vaults.
 */
export interface KdfParams {
  algo: "argon2id";
  memKiB: number;
  time: number;
  parallelism: number;
  saltB64: string;
}

// Interactive defaults: ~64 MiB, 3 passes. Tuned to stay responsive on phones
// while remaining costly to attack offline. Raise memKiB for higher assurance.
export const DEFAULT_KDF: Omit<KdfParams, "saltB64"> = {
  algo: "argon2id",
  memKiB: 64 * 1024,
  time: 3,
  parallelism: 1,
};

export const SALT_LENGTH = 16;
export const KEY_LENGTH = 32; // 256-bit derived key-encryption-key

export function newSalt(): Uint8Array {
  return randomBytes(SALT_LENGTH);
}

/**
 * Derive a 256-bit key-encryption-key (KEK) from a passphrase. The passphrase
 * is NEVER used directly as the data key: the KEK only wraps a randomly
 * generated data-encryption-key (see vault.ts).
 */
export async function deriveKek(
  passphrase: string,
  params: KdfParams,
): Promise<Uint8Array> {
  const salt = base64Salt(params.saltB64);
  const pw = utf8ToBytes(passphrase);
  try {
    const key = await argon2idAsync(pw, salt, {
      t: params.time,
      m: params.memKiB,
      p: params.parallelism,
      dkLen: KEY_LENGTH,
    });
    return key;
  } finally {
    // Clear the transient UTF-8 copy of the passphrase.
    wipe(pw);
  }
}

function base64Salt(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
