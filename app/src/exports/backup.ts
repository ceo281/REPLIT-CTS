import { bytesToBase64, bytesToUtf8, utf8ToBytes, wipe } from "../crypto/bytes";
import { importRawKey, open, seal, type Sealed } from "../crypto/cipher";
import { deriveKek, DEFAULT_KDF, newSalt, type KdfParams } from "../crypto/kdf";
import type { VaultKind, VaultMeta } from "../crypto/vault";
import type { EncryptedRow } from "../storage/db";
import {
  exportRawRows,
  importRawRows,
  loadVaultMeta,
  saveVaultMeta,
} from "../storage/repo";

/**
 * Encrypted backup. A backup is NEVER a plaintext copy of the database:
 *
 *   1. The records inside are already ciphertext, sealed under the vault DEK.
 *   2. The whole bundle (records + the wrapped-DEK metadata) is sealed AGAIN
 *      under a *separate backup key* derived from a distinct backup passphrase.
 *
 * So a backup file requires BOTH the backup passphrase (to open the bundle) and
 * later the vault passphrase (to read the records). Losing the vault passphrase
 * but keeping the backup passphrase still won't reveal records — restoring
 * re-installs the encrypted vault, which the vault passphrase then unlocks.
 */

export const BACKUP_FORMAT = "dvl-backup-v1";

interface BackupBundle {
  kind: VaultKind;
  meta: VaultMeta;
  rows: EncryptedRow[];
  createdAt: number;
}

export interface BackupFileFormat {
  format: typeof BACKUP_FORMAT;
  kdf: KdfParams;
  sealed: Sealed;
}

const BACKUP_AAD = utf8ToBytes("dvl:backup");

export async function createBackup(
  vault: VaultKind,
  backupPassphrase: string,
  kdfOverride?: Partial<Omit<KdfParams, "saltB64">>,
): Promise<{ filename: string; content: string } | null> {
  const meta = await loadVaultMeta(vault);
  if (!meta) return null;
  const rows = await exportRawRows(vault);
  const bundle: BackupBundle = { kind: vault, meta, rows, createdAt: Date.now() };

  const kdf: KdfParams = { ...DEFAULT_KDF, ...kdfOverride, saltB64: bytesToBase64(newSalt()) };
  const keyBytes = await deriveKek(backupPassphrase, kdf);
  try {
    const key = await importRawKey(keyBytes, ["encrypt"], false);
    const plaintext = utf8ToBytes(JSON.stringify(bundle));
    const sealed = await seal(key, plaintext, BACKUP_AAD);
    wipe(plaintext);
    const file: BackupFileFormat = { format: BACKUP_FORMAT, kdf, sealed };
    const d = new Date();
    const name = `vault-backup-${vault}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    return { filename: name, content: JSON.stringify(file, null, 2) };
  } finally {
    wipe(keyBytes);
  }
}

export interface RestoreResult {
  ok: boolean;
  error?: "bad-format" | "wrong-passphrase";
  kind?: VaultKind;
  rowCount?: number;
}

export async function restoreBackup(
  fileText: string,
  backupPassphrase: string,
): Promise<RestoreResult> {
  let file: BackupFileFormat;
  try {
    file = JSON.parse(fileText);
    if (file.format !== BACKUP_FORMAT || !file.kdf || !file.sealed) {
      return { ok: false, error: "bad-format" };
    }
  } catch {
    return { ok: false, error: "bad-format" };
  }

  const keyBytes = await deriveKek(backupPassphrase, file.kdf);
  try {
    const key = await importRawKey(keyBytes, ["decrypt"], false);
    let bundle: BackupBundle;
    try {
      const pt = await open(key, file.sealed, BACKUP_AAD);
      bundle = JSON.parse(bytesToUtf8(pt));
      wipe(pt);
    } catch {
      return { ok: false, error: "wrong-passphrase" };
    }
    await saveVaultMeta(bundle.meta);
    await importRawRows(bundle.rows);
    return { ok: true, kind: bundle.kind, rowCount: bundle.rows.length };
  } finally {
    wipe(keyBytes);
  }
}
