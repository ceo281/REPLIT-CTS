import type { DomainObject } from "../storage/repo";

/**
 * The private vault models people and their records. Totals are ALWAYS derived
 * from records (see calc.ts) — never stored on the person — so they can never
 * drift out of sync with the underlying history.
 */

export interface Person extends DomainObject {
  id: string;
  displayName: string;
  createdAt: number;
  notes?: string;
}

export interface PersonRecord extends DomainObject {
  id: string;
  personId: string;
  timestamp: number; // date + time of the event
  type: string; // user-defined record type (e.g. "sale", "visit")
  quantity: number;
  amount: number; // minor units
  occurrence?: string; // event / occurrence label
  note?: string;
  createdAt: number;
}

export const PEOPLE_COLLECTIONS = {
  person: "ppl.person",
  record: "ppl.record",
  recordType: "ppl.type",
} as const;

export interface RecordType extends DomainObject {
  id: string;
  label: string;
}
