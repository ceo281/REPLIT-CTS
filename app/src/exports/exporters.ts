import type { Account, Budget, Transaction } from "../finance/types";
import { accountBalance, totalsFor } from "../finance/calc";
import type { Person, PersonRecord } from "../people/types";
import { overallTotals, totalsForPerson } from "../people/calc";

/**
 * Export builders. Each returns a named payload. The security-relevant property
 * is enforced structurally: finance exports are built only from finance-vault
 * data (the caller has no access to the private DEK), so private records can
 * never leak into a finance export.
 */
export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

function json(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function csv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

// ---- Finance exports -------------------------------------------------------

/** Full finance export: everything in the finance vault. */
export function exportFinanceFull(
  accounts: Account[],
  txns: Transaction[],
  budgets: Budget[],
): ExportFile {
  return {
    filename: `finance-full-${stamp()}.json`,
    mime: "application/json",
    content: json({ kind: "finance-full", exportedAt: Date.now(), accounts, txns, budgets }),
  };
}

/** Finance export without free-text notes / personal detail. */
export function exportFinance(accounts: Account[], txns: Transaction[]): ExportFile {
  const rows: (string | number)[][] = [
    ["date", "account", "kind", "category", "quantity", "amount"],
  ];
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  for (const t of txns) {
    rows.push([
      new Date(t.timestamp).toISOString(),
      acctName.get(t.accountId) ?? "",
      t.kind,
      t.category,
      t.quantity ?? "",
      (t.amount / 100).toFixed(2),
    ]);
  }
  return { filename: `finance-${stamp()}.csv`, mime: "text/csv", content: csv(rows) };
}

/** Finance summary: totals and balances only. */
export function exportFinanceSummary(accounts: Account[], txns: Transaction[]): ExportFile {
  const totals = totalsFor(txns);
  const balances = accounts.map((a) => ({ account: a.name, balance: accountBalance(a, txns) }));
  return {
    filename: `finance-summary-${stamp()}.json`,
    mime: "application/json",
    content: json({ kind: "finance-summary", exportedAt: Date.now(), totals, balances }),
  };
}

// ---- Private (people) exports ----------------------------------------------

/** Full authorized export of the private vault. */
export function exportPeopleFull(people: Person[], records: PersonRecord[]): ExportFile {
  return {
    filename: `people-full-${stamp()}.json`,
    mime: "application/json",
    content: json({ kind: "people-full", exportedAt: Date.now(), people, records }),
  };
}

/** Totals per person and overall — no individual records, no notes. */
export function exportPeopleSummary(people: Person[], records: PersonRecord[]): ExportFile {
  const perPerson = people.map((p) => {
    const t = totalsForPerson(records.filter((r) => r.personId === p.id));
    return {
      name: p.displayName,
      totalAmount: t.totalAmount,
      totalQuantity: t.totalQuantity,
      occurrences: t.occurrences,
      firstAt: t.firstAt,
      lastAt: t.lastAt,
    };
  });
  return {
    filename: `people-summary-${stamp()}.json`,
    mime: "application/json",
    content: json({
      kind: "people-summary",
      exportedAt: Date.now(),
      overall: overallTotals(people, records),
      people: perPerson,
    }),
  };
}

/**
 * Anonymized export: display names replaced with stable random identifiers and
 * all free-text (notes, occurrence labels) stripped, so quantities/amounts can
 * be analyzed without exposing identities.
 */
export function exportPeopleAnonymized(people: Person[], records: PersonRecord[]): ExportFile {
  const alias = new Map<string, string>();
  people.forEach((p) => {
    alias.set(p.id, `Subject-${randomTag()}`);
  });
  const anonPeople = people.map((p) => ({
    id: alias.get(p.id),
    createdAt: p.createdAt,
  }));
  const anonRecords = records.map((r) => ({
    person: alias.get(r.personId) ?? `Subject-${randomTag()}`,
    timestamp: r.timestamp,
    type: r.type,
    quantity: r.quantity,
    amount: r.amount,
  }));
  return {
    filename: `people-anonymized-${stamp()}.json`,
    mime: "application/json",
    content: json({
      kind: "people-anonymized",
      exportedAt: Date.now(),
      people: anonPeople,
      records: anonRecords,
    }),
  };
}

function randomTag(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Trigger a browser download for an export file. */
export function downloadFile(file: ExportFile): void {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
