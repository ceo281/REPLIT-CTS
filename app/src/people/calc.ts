import type { Person, PersonRecord } from "./types";

/**
 * All person and dashboard totals are computed from raw records here. Nothing is
 * ever persisted as a stored total, so history and totals cannot disagree.
 */

export interface PersonTotals {
  totalAmount: number;
  totalQuantity: number;
  occurrences: number;
  firstAt?: number;
  lastAt?: number;
}

export function totalsForPerson(records: PersonRecord[]): PersonTotals {
  if (records.length === 0) {
    return { totalAmount: 0, totalQuantity: 0, occurrences: 0 };
  }
  let totalAmount = 0;
  let totalQuantity = 0;
  let firstAt = Infinity;
  let lastAt = -Infinity;
  for (const r of records) {
    totalAmount += r.amount;
    totalQuantity += r.quantity;
    if (r.timestamp < firstAt) firstAt = r.timestamp;
    if (r.timestamp > lastAt) lastAt = r.timestamp;
  }
  return {
    totalAmount,
    totalQuantity,
    occurrences: records.length,
    firstAt,
    lastAt,
  };
}

/** Records with a running (cumulative) amount+quantity, oldest→newest. */
export interface RunningRecord extends PersonRecord {
  runningAmount: number;
  runningQuantity: number;
}

export function withRunningTotals(records: PersonRecord[]): RunningRecord[] {
  const asc = [...records].sort((a, b) => a.timestamp - b.timestamp);
  let amount = 0;
  let quantity = 0;
  return asc.map((r) => {
    amount += r.amount;
    quantity += r.quantity;
    return { ...r, runningAmount: amount, runningQuantity: quantity };
  });
}

// ---- Dashboard aggregation -------------------------------------------------

export interface OverallTotals {
  people: number;
  records: number;
  totalAmount: number;
  totalQuantity: number;
  occurrences: number;
}

export function overallTotals(
  people: Person[],
  records: PersonRecord[],
): OverallTotals {
  const t = totalsForPerson(records);
  return {
    people: people.length,
    records: records.length,
    totalAmount: t.totalAmount,
    totalQuantity: t.totalQuantity,
    occurrences: t.occurrences,
  };
}

// ---- Filtering -------------------------------------------------------------

export interface RecordFilter {
  personId?: string;
  type?: string;
  from?: number;
  to?: number;
  minQuantity?: number;
  maxQuantity?: number;
  minAmount?: number;
  maxAmount?: number;
  text?: string;
}

export function filterRecords(
  records: PersonRecord[],
  f: RecordFilter,
): PersonRecord[] {
  const needle = f.text?.trim().toLowerCase();
  return records.filter((r) => {
    if (f.personId && r.personId !== f.personId) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.from !== undefined && r.timestamp < f.from) return false;
    if (f.to !== undefined && r.timestamp > f.to) return false;
    if (f.minQuantity !== undefined && r.quantity < f.minQuantity) return false;
    if (f.maxQuantity !== undefined && r.quantity > f.maxQuantity) return false;
    if (f.minAmount !== undefined && r.amount < f.minAmount) return false;
    if (f.maxAmount !== undefined && r.amount > f.maxAmount) return false;
    if (needle) {
      const hay = `${r.occurrence ?? ""} ${r.note ?? ""} ${r.type}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export type PresetPeriod = "today" | "week" | "month" | "year" | "all" | "custom";

export function periodRange(
  period: PresetPeriod,
  now = Date.now(),
): { from?: number; to?: number } {
  if (period === "all" || period === "custom") return {};
  const d = new Date(now);
  let from: number;
  if (period === "today") {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    from = s.getTime();
  } else if (period === "week") {
    const day = (d.getDay() + 6) % 7;
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    from = s.getTime() - day * 86_400_000;
  } else if (period === "month") {
    from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  } else {
    from = new Date(d.getFullYear(), 0, 1).getTime();
  }
  return { from, to: now };
}
