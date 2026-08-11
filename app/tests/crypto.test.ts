import { describe, it, expect } from "vitest";
import { seal, open, importRawKey, generateDataKeyBytes } from "../src/crypto/cipher";
import { utf8ToBytes, bytesToUtf8, randomBytes, timingSafeEqual } from "../src/crypto/bytes";
import { deriveKek, DEFAULT_KDF, newSalt } from "../src/crypto/kdf";
import { bytesToBase64 } from "../src/crypto/bytes";

describe("AES-256-GCM authenticated encryption", () => {
  it("round-trips plaintext", async () => {
    const key = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const msg = utf8ToBytes("hello vault");
    const sealed = await seal(key, msg);
    const opened = await open(key, sealed);
    expect(bytesToUtf8(opened)).toBe("hello vault");
  });

  it("uses a fresh IV per call (no nonce reuse)", async () => {
    const key = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const a = await seal(key, utf8ToBytes("same"));
    const b = await seal(key, utf8ToBytes("same"));
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("rejects a tampered ciphertext (integrity)", async () => {
    const key = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const sealed = await seal(key, utf8ToBytes("secret"));
    const bytes = Uint8Array.from(atob(sealed.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    const tampered = { iv: sealed.iv, ct: bytesToBase64(bytes) };
    await expect(open(key, tampered)).rejects.toBeTruthy();
  });

  it("rejects the wrong key", async () => {
    const k1 = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const k2 = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const sealed = await seal(k1, utf8ToBytes("secret"));
    await expect(open(k2, sealed)).rejects.toBeTruthy();
  });

  it("enforces associated data (AAD binding)", async () => {
    const key = await importRawKey(generateDataKeyBytes(), ["encrypt", "decrypt"]);
    const sealed = await seal(key, utf8ToBytes("secret"), utf8ToBytes("record:1"));
    await expect(open(key, sealed, utf8ToBytes("record:2"))).rejects.toBeTruthy();
    const ok = await open(key, sealed, utf8ToBytes("record:1"));
    expect(bytesToUtf8(ok)).toBe("secret");
  });
});

describe("Argon2id key derivation", () => {
  it("derives a 32-byte key deterministically for same salt+passphrase", async () => {
    const kdf = { ...DEFAULT_KDF, memKiB: 8 * 1024, time: 2, saltB64: bytesToBase64(newSalt()) };
    const a = await deriveKek("correct horse battery staple", kdf);
    const b = await deriveKek("correct horse battery staple", kdf);
    expect(a.length).toBe(32);
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  it("produces different keys for different salts", async () => {
    const kdfA = { ...DEFAULT_KDF, memKiB: 8 * 1024, time: 2, saltB64: bytesToBase64(newSalt()) };
    const kdfB = { ...DEFAULT_KDF, memKiB: 8 * 1024, time: 2, saltB64: bytesToBase64(newSalt()) };
    const a = await deriveKek("same-pass", kdfA);
    const b = await deriveKek("same-pass", kdfB);
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it("produces different keys for different passphrases", async () => {
    const kdf = { ...DEFAULT_KDF, memKiB: 8 * 1024, time: 2, saltB64: bytesToBase64(newSalt()) };
    const a = await deriveKek("pass-one", kdf);
    const b = await deriveKek("pass-two", kdf);
    expect(timingSafeEqual(a, b)).toBe(false);
  });
});

describe("randomness", () => {
  it("generates unique keys", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(bytesToBase64(randomBytes(32)));
    expect(seen.size).toBe(100);
  });
});
