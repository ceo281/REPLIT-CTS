import { describe, it, expect, beforeEach } from "vitest";
import { _resetDbForTests } from "../src/storage/db";
import { provisionVault, unlockAttempt, _setKdfOverrideForTests } from "../src/session/auth";
import { createBackup, restoreBackup } from "../src/exports/backup";
import { createPerson, listPeople } from "../src/people/api";

_setKdfOverrideForTests({ memKiB: 8 * 1024, time: 1 });

async function freshDb() {
  await _resetDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("dvl");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe("encrypted backup / restore", () => {
  beforeEach(freshDb);

  it("round-trips a vault through an encrypted backup", async () => {
    const prov = await provisionVault("private", "vault-pw");
    expect(prov.ok).toBe(true);
    await createPerson(prov.dek!, { displayName: "Alice", notes: "secret" });

    const backup = await createBackup("private", "backup-pw-different", { memKiB: 8*1024, time: 1 });
    expect(backup).not.toBeNull();
    // The backup content must not contain the plaintext name.
    expect(backup!.content).not.toContain("Alice");
    expect(backup!.content).toContain("dvl-backup-v1");

    // Wipe the database entirely.
    await freshDb();
    expect((await unlockAttempt("vault-pw")).ok).toBe(false);

    // Restore from backup, then unlock with the ORIGINAL vault passphrase.
    const res = await restoreBackup(backup!.content, "backup-pw-different");
    expect(res.ok).toBe(true);
    expect(res.kind).toBe("private");

    const unlocked = await unlockAttempt("vault-pw");
    expect(unlocked.ok).toBe(true);
    const people = await listPeople(unlocked.dek!);
    expect(people.map((p) => p.displayName)).toContain("Alice");
  });

  it("rejects restore with the wrong backup passphrase", async () => {
    await provisionVault("private", "vault-pw");
    const backup = await createBackup("private", "backup-pw", { memKiB: 8*1024, time: 1 });
    await freshDb();
    const res = await restoreBackup(backup!.content, "wrong-backup-pw");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("wrong-passphrase");
  });

  it("rejects a malformed backup file", async () => {
    const res = await restoreBackup("{not a backup}", "pw");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("bad-format");
  });
});
