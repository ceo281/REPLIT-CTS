import { deleteRecord, getRecord, listRecords, putRecord } from "../storage/repo";
import {
  PEOPLE_COLLECTIONS as C,
  type Person,
  type PersonRecord,
  type RecordType,
} from "./types";

const VAULT = "private" as const;
const uid = () => crypto.randomUUID();

// ---- People ----------------------------------------------------------------

export async function listPeople(dek: CryptoKey): Promise<Person[]> {
  return (await listRecords<Person>(dek, VAULT, C.person)).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

export async function getPerson(dek: CryptoKey, id: string): Promise<Person | undefined> {
  return getRecord<Person>(dek, VAULT, C.person, id);
}

export async function createPerson(
  dek: CryptoKey,
  input: { displayName: string; notes?: string },
): Promise<Person> {
  const p: Person = {
    id: uid(),
    displayName: input.displayName.trim(),
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
  };
  await putRecord(dek, VAULT, C.person, p);
  return p;
}

export async function updatePerson(dek: CryptoKey, p: Person): Promise<void> {
  await putRecord(dek, VAULT, C.person, p);
}

export async function deletePerson(dek: CryptoKey, id: string): Promise<void> {
  const records = await listRecords<PersonRecord>(dek, VAULT, C.record);
  for (const r of records.filter((r) => r.personId === id)) {
    await deleteRecord(VAULT, r.id);
  }
  await deleteRecord(VAULT, id);
}

// ---- Records ---------------------------------------------------------------

export async function listAllRecords(dek: CryptoKey): Promise<PersonRecord[]> {
  return (await listRecords<PersonRecord>(dek, VAULT, C.record)).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export async function listRecordsFor(
  dek: CryptoKey,
  personId: string,
): Promise<PersonRecord[]> {
  return (await listAllRecords(dek)).filter((r) => r.personId === personId);
}

export async function newRecord(
  dek: CryptoKey,
  input: Omit<PersonRecord, "id" | "createdAt">,
): Promise<PersonRecord> {
  const r: PersonRecord = { ...input, id: uid(), createdAt: Date.now() };
  await putRecord(dek, VAULT, C.record, r);
  return r;
}

export async function saveRecord(dek: CryptoKey, r: PersonRecord): Promise<void> {
  await putRecord(dek, VAULT, C.record, r);
}

export async function deleteRecordById(_dek: CryptoKey, id: string): Promise<void> {
  await deleteRecord(VAULT, id);
}

// ---- Record types (custom) -------------------------------------------------

const DEFAULT_TYPES = ["sale", "payment", "visit", "note"];

export async function listRecordTypes(dek: CryptoKey): Promise<string[]> {
  const custom = await listRecords<RecordType>(dek, VAULT, C.recordType);
  const set = new Set<string>([...DEFAULT_TYPES, ...custom.map((t) => t.label)]);
  return [...set];
}

export async function addRecordType(dek: CryptoKey, label: string): Promise<void> {
  const clean = label.trim();
  if (!clean) return;
  await putRecord(dek, VAULT, C.recordType, { id: uid(), label: clean });
}
