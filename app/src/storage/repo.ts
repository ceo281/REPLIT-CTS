import { getDb, type EncryptedRow } from "./db";
import { open, seal } from "../crypto/cipher";
import { utf8ToBytes, bytesToUtf8 } from "../crypto/bytes";
import type { VaultKind, VaultMeta } from "../crypto/vault";

/**
 * The repository turns plaintext domain objects into ciphertext rows and back,
 * using the *active vault's* DEK. Callers never see ciphertext; storage never
 * sees plaintext.
 */

function recAad(vault: VaultKind, collection: string, id: string): Uint8Array {
  return utf8ToBytes(`dvl:rec:${vault}:${collection}:${id}`);
}

export interface DomainObject {
  id: string;
}

// ---- Vault metadata (non-secret) ------------------------------------------

export async function loadVaultMeta(kind: VaultKind): Promise<VaultMeta | undefined> {
  const db = await getDb();
  return db.get("vaults", kind);
}

export async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  const db = await getDb();
  await db.put("vaults", meta);
}

export async function listVaultMetas(): Promise<VaultMeta[]> {
  const db = await getDb();
  return db.getAll("vaults");
}

// ---- Encrypted records -----------------------------------------------------

export async function putRecord<T extends DomainObject>(
  dek: CryptoKey,
  vault: VaultKind,
  collection: string,
  obj: T,
): Promise<void> {
  const db = await getDb();
  const plaintext = utf8ToBytes(JSON.stringify(obj));
  const payload = await seal(dek, plaintext, recAad(vault, collection, obj.id));
  plaintext.fill(0);
  const row: EncryptedRow = { id: obj.id, vault, collection, payload };
  await db.put("records", row);
}

export async function getRecord<T extends DomainObject>(
  dek: CryptoKey,
  vault: VaultKind,
  collection: string,
  id: string,
): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("records", id);
  if (!row || row.vault !== vault || row.collection !== collection) return undefined;
  return decodeRow<T>(dek, row);
}

export async function listRecords<T extends DomainObject>(
  dek: CryptoKey,
  vault: VaultKind,
  collection: string,
): Promise<T[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("records", "by_vault_collection", [vault, collection]);
  const out: T[] = [];
  for (const row of rows) {
    const obj = await decodeRow<T>(dek, row);
    if (obj) out.push(obj);
  }
  return out;
}

export async function deleteRecord(vault: VaultKind, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("records", id);
  if (!row || row.vault !== vault) return;
  await db.delete("records", id);
}

async function decodeRow<T extends DomainObject>(
  dek: CryptoKey,
  row: EncryptedRow,
): Promise<T | undefined> {
  try {
    const pt = await open(dek, row.payload, recAad(row.vault, row.collection, row.id));
    const obj = JSON.parse(bytesToUtf8(pt)) as T;
    pt.fill(0);
    return obj;
  } catch {
    // Wrong key or tampered row. We do not throw so a single corrupt row does
    // not take down a whole list; the row is skipped and surfaced elsewhere.
    return undefined;
  }
}

/** Count rows without decrypting — used for integrity/tamper checks. */
export async function rawRowCount(vault: VaultKind): Promise<number> {
  const db = await getDb();
  return db.countFromIndex("records", "by_vault", vault);
}

/** Export all raw ciphertext rows (for encrypted backup). No decryption. */
export async function exportRawRows(): Promise<EncryptedRow[]> {
  const db = await getDb();
  return db.getAll("records");
}

// ---- App-level non-secret key/value (counters, settings) -------------------

export async function appGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("app", key)) as T | undefined;
}

export async function appSet<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put("app", value, key);
}
