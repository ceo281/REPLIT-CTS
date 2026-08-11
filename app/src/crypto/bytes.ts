// Byte / encoding utilities. No secrets are logged here.

export function randomBytes(length: number): Uint8Array {
  const b = new Uint8Array(length);
  crypto.getRandomValues(b);
  return b;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function utf8ToBytes(s: string): Uint8Array {
  return enc.encode(s);
}

export function bytesToUtf8(b: Uint8Array): string {
  return dec.decode(b);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Constant-time equality for two byte arrays. Used where a timing side channel
 * could otherwise leak information (e.g. comparing verifiers).
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Best-effort zeroing of a byte buffer holding key material. JavaScript cannot
 * guarantee memory is not copied by the GC, but overwriting the buffer we hold
 * shortens the window in which raw key bytes sit in a reachable object.
 */
export function wipe(...buffers: (Uint8Array | undefined | null)[]): void {
  for (const b of buffers) {
    if (b) b.fill(0);
  }
}
