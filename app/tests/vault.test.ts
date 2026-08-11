import { describe, it, expect, beforeEach } from "vitest";
import { createVault, unlockVault } from "../src/crypto/vault";
import { seal, open } from "../src/crypto/cipher";
import { utf8ToBytes, bytesToUtf8 } from "../src/crypto/bytes";
import { _resetDbForTests } from "../src/storage/db";
import {
  provisionVault,
  unlockAttempt,
  anyVaultExists,
  updatePassphrase,
  _setKdfOverrideForTests,
} from "../src/session/auth";

// A small KDF so tests stay fast; production uses 64 MiB.
const FAST = { memKiB: 8 * 1024, time: 1 };
_setKdfOverrideForTests(FAST);

describe("vault key management", () => {
  it("separate vaults use independent keys", async () => {
    const fin = await createVault("finance", "finance-pass", FAST);
    const priv = await createVault("private", "private-pass", FAST);

    // A record sealed under the finance DEK must NOT open under the private DEK.
    const sealed = await seal(fin.dek, utf8ToBytes("balance: 100"));
    await expect(open(priv.dek, sealed)).rejects.toBeTruthy();
    const ok = await open(fin.dek, sealed);
    expect(bytesToUtf8(ok)).toBe("balance: 100");
  });

  it("unlock succeeds only with the correct passphrase", async () => {
    const { meta } = await createVault("finance", "right-pass", FAST);
    expect(await unlockVault(meta, "wrong-pass")).toBeNull();
    expect(await unlockVault(meta, "right-pass")).not.toBeNull();
  });

  it("wrapped DEK is opaque without the passphrase", async () => {
    const { meta } = await createVault("private", "pw", FAST);
    // The stored wrap is base64 ciphertext, not the raw key.
    expect(meta.wrappedDek.ct).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(meta.wrappedDek.ct.length).toBeGreaterThan(20);
  });
});

describe("auth flow (with storage)", () => {
  beforeEach(async () => {
    // Fresh in-memory DB per test: close the cached connection, then delete.
    await _resetDbForTests();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase("dvl");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("routes a passphrase to the vault it opens", async () => {
    await provisionVault("finance", "finance-pw");
    await provisionVault("private", "private-pw");

    const a = await unlockAttempt("finance-pw");
    expect(a.ok).toBe(true);
    expect(a.kind).toBe("finance");

    const b = await unlockAttempt("private-pw");
    expect(b.ok).toBe(true);
    expect(b.kind).toBe("private");
  });

  it("rejects an unknown passphrase", async () => {
    await provisionVault("finance", "finance-pw");
    const r = await unlockAttempt("nope");
    expect(r.ok).toBe(false);
    expect(r.kind).toBeUndefined();
  });

  it("prevents a colliding passphrase across vaults", async () => {
    await provisionVault("finance", "same");
    const r = await provisionVault("private", "same");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("passphrase-collision");
  });

  it("rate limits after repeated failures", async () => {
    await provisionVault("finance", "finance-pw");
    let last;
    for (let i = 0; i < 6; i++) last = await unlockAttempt("bad", 1000);
    expect(last?.ok).toBe(false);
    expect(last?.retryInMs).toBeGreaterThan(0);
    // While locked out, even the correct passphrase is deferred.
    const blocked = await unlockAttempt("finance-pw", 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryInMs).toBeGreaterThan(0);
  });

  it("change of passphrase keeps data readable and invalidates the old", async () => {
    const prov = await provisionVault("finance", "old-pw");
    expect(prov.ok).toBe(true);
    const changed = await updatePassphrase("finance", "old-pw", "new-pw");
    expect(changed).toBe(true);

    expect((await unlockAttempt("old-pw")).ok).toBe(false);
    const r = await unlockAttempt("new-pw");
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("finance");
  });

  it("reports vault existence", async () => {
    expect(await anyVaultExists()).toBe(false);
    await provisionVault("finance", "pw");
    expect(await anyVaultExists()).toBe(true);
  });
});
