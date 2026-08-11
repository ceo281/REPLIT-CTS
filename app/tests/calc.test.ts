import { describe, it, expect } from "vitest";
import {
  totalsForPerson,
  withRunningTotals,
  overallTotals,
  filterRecords,
  periodRange,
} from "../src/people/calc";
import type { Person, PersonRecord } from "../src/people/types";
import {
  accountBalance,
  totalsFor,
  budgetStatus,
  byCategory,
  inPeriod,
} from "../src/finance/calc";
import type { Account, Budget, Transaction } from "../src/finance/types";

function rec(p: Partial<PersonRecord>): PersonRecord {
  return {
    id: crypto.randomUUID(),
    personId: "p1",
    timestamp: 0,
    type: "sale",
    quantity: 1,
    amount: 100,
    createdAt: 0,
    ...p,
  };
}

describe("people running totals (derived from records)", () => {
  const records = [
    rec({ timestamp: 300, amount: 500, quantity: 5 }),
    rec({ timestamp: 100, amount: 200, quantity: 2 }),
    rec({ timestamp: 200, amount: 300, quantity: 3 }),
  ];

  it("aggregates totals independent of input order", () => {
    const t = totalsForPerson(records);
    expect(t.totalAmount).toBe(1000);
    expect(t.totalQuantity).toBe(10);
    expect(t.occurrences).toBe(3);
    expect(t.firstAt).toBe(100);
    expect(t.lastAt).toBe(300);
  });

  it("computes running totals oldest to newest", () => {
    const running = withRunningTotals(records);
    expect(running.map((r) => r.runningAmount)).toEqual([200, 500, 1000]);
    expect(running.map((r) => r.runningQuantity)).toEqual([2, 5, 10]);
  });

  it("returns zeroed totals for a person with no records", () => {
    const t = totalsForPerson([]);
    expect(t).toEqual({ totalAmount: 0, totalQuantity: 0, occurrences: 0 });
  });

  it("overall totals aggregate all people and records", () => {
    const people: Person[] = [
      { id: "p1", displayName: "A", createdAt: 0 },
      { id: "p2", displayName: "B", createdAt: 0 },
    ];
    const o = overallTotals(people, records);
    expect(o.people).toBe(2);
    expect(o.records).toBe(3);
    expect(o.totalAmount).toBe(1000);
  });
});

describe("record filtering", () => {
  const records = [
    rec({ id: "a", type: "sale", amount: 100, quantity: 1, occurrence: "market" }),
    rec({ id: "b", type: "visit", amount: 0, quantity: 0, note: "follow up" }),
    rec({ id: "c", type: "sale", amount: 900, quantity: 9, personId: "p2" }),
  ];

  it("filters by type", () => {
    expect(filterRecords(records, { type: "sale" }).map((r) => r.id)).toEqual(["a", "c"]);
  });
  it("filters by amount range", () => {
    expect(filterRecords(records, { minAmount: 500 }).map((r) => r.id)).toEqual(["c"]);
  });
  it("filters by person", () => {
    expect(filterRecords(records, { personId: "p2" }).map((r) => r.id)).toEqual(["c"]);
  });
  it("filters by free text over occurrence/note/type", () => {
    expect(filterRecords(records, { text: "follow" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterRecords(records, { text: "market" }).map((r) => r.id)).toEqual(["a"]);
  });

  it("periodRange today has a start and end", () => {
    const r = periodRange("today", new Date("2026-08-11T12:00:00").getTime());
    expect(r.from).toBeLessThan(r.to!);
  });
  it("periodRange all is unbounded", () => {
    expect(periodRange("all")).toEqual({});
  });
});

describe("finance calc", () => {
  const acct: Account = { id: "acc", name: "Cash", openingBalance: 1000, createdAt: 0 };
  const txns: Transaction[] = [
    { id: "t1", accountId: "acc", kind: "income", amount: 500, category: "salary", timestamp: 0, createdAt: 0 },
    { id: "t2", accountId: "acc", kind: "expense", amount: 200, category: "food", timestamp: 0, createdAt: 0 },
    { id: "t3", accountId: "acc", kind: "sale", amount: 300, quantity: 3, category: "goods", timestamp: 0, createdAt: 0 },
  ];

  it("derives account balance from opening + signed txns", () => {
    // 1000 + 500 - 200 + 300 = 1600
    expect(accountBalance(acct, txns)).toBe(1600);
  });

  it("totals split income/expense/sales and sales quantity", () => {
    const t = totalsFor(txns);
    expect(t.income).toBe(500);
    expect(t.expense).toBe(200);
    expect(t.sales).toBe(300);
    expect(t.salesQuantity).toBe(3);
    expect(t.net).toBe(600);
  });

  it("budget status computes spent from this month's expenses", () => {
    const now = Date.now();
    const budgets: Budget[] = [{ id: "b", category: "food", limit: 500, period: "month", createdAt: 0 }];
    const monthTxn: Transaction = { id: "t", accountId: "acc", kind: "expense", amount: 120, category: "food", timestamp: now, createdAt: now };
    const [s] = budgetStatus(budgets, [monthTxn], now);
    expect(s.spent).toBe(120);
    expect(s.remaining).toBe(380);
  });

  it("byCategory groups and sorts descending", () => {
    const rows = byCategory(txns, "income");
    expect(rows[0]).toEqual({ category: "salary", amount: 500 });
  });

  it("inPeriod filters to the window", () => {
    const now = Date.now();
    const old: Transaction = { id: "o", accountId: "acc", kind: "income", amount: 1, category: "x", timestamp: now - 400 * 86_400_000, createdAt: 0 };
    const fresh: Transaction = { id: "f", accountId: "acc", kind: "income", amount: 1, category: "x", timestamp: now, createdAt: 0 };
    expect(inPeriod([old, fresh], "month", now).map((t) => t.id)).toEqual(["f"]);
  });
});
