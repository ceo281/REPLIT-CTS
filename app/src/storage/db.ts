import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { VaultKind, VaultMeta } from "../crypto/vault";
import type { Sealed } from "../crypto/cipher";

/**
 * On-disk shape. The `records` store holds ONLY ciphertext (`payload`), plus the
 * minimum plaintext needed to route a row to the right key and query it:
 *   - `vault`: which vault's DEK decrypts it (kind is not record content)
 *   - `collection`: coarse type tag (e.g. "person", "txn") used for indexing
 * No names, amounts, notes, or dates are stored in the clear. See SECURITY.md
 * for what this metadata does and does not reveal.
 */
export interface EncryptedRow {
  id: string;
  vault: VaultKind;
  collection: string;
  payload: Sealed;
}

interface DvlSchema extends DBSchema {
  vaults: {
    key: VaultKind;
    value: VaultMeta;
  };
  records: {
    key: string;
    value: EncryptedRow;
    indexes: {
      by_vault: VaultKind;
      by_vault_collection: [VaultKind, string];
    };
  };
  app: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "dvl";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DvlSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<DvlSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DvlSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("vaults", { keyPath: "kind" });
        const rec = db.createObjectStore("records", { keyPath: "id" });
        rec.createIndex("by_vault", "vault");
        rec.createIndex("by_vault_collection", ["vault", "collection"]);
        db.createObjectStore("app");
      },
    });
  }
  return dbPromise;
}

/** For tests: close and forget the cached connection so a fresh DB can be opened. */
export async function _resetDbForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* ignore */
    }
  }
  dbPromise = null;
}
