import {
  signedAmount,
  type Account,
  type Budget,
  type Transaction,
} from "./types";

/** All amounts are minor units (cents). Balances derive from transactions. */

export function accountBalance(account: Account, txns: Transaction[]): number {
  return txns
    .filter((t) => t.accountId === account.id)
    .reduce((sum, t) => sum + signedAmount(t), account.openingBalance);
}

export function totalBalance(accounts: Account[], txns: Transaction[]): number {
  return accounts.reduce((s, a) => s + accountBalance(a, txns), 0);
}

export interface Totals {
  income: number;
  expense: number;
  sales: number;
  salesQuantity: number;
  net: number;
  count: number;
}

export function totalsFor(txns: Transaction[]): Totals {
  const t: Totals = {
    income: 0,
    expense: 0,
    sales: 0,
    salesQuantity: 0,
    net: 0,
    count: txns.length,
  };
  for (const x of txns) {
    if (x.kind === "income") t.income += x.amount;
    else if (x.kind === "expense") t.expense += x.amount;
    else if (x.kind === "sale") {
      t.sales += x.amount;
      t.salesQuantity += x.quantity ?? 0;
    }
    t.net += signedAmount(x);
  }
  return t;
}

// ---- Time helpers ----------------------------------------------------------

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function withinPeriod(
  ts: number,
  period: "today" | "week" | "month" | "year",
  now: number,
): boolean {
  const d = new Date(now);
  let from: number;
  if (period === "today") {
    from = startOfDay(now);
  } else if (period === "week") {
    const day = (d.getDay() + 6) % 7; // Monday start
    from = startOfDay(now - day * 86_400_000);
  } else if (period === "month") {
    from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  } else {
    from = new Date(d.getFullYear(), 0, 1).getTime();
  }
  return ts >= from && ts <= now;
}

export function inPeriod(
  txns: Transaction[],
  period: "today" | "week" | "month" | "year",
  now = Date.now(),
): Transaction[] {
  return txns.filter((t) => withinPeriod(t.timestamp, period, now));
}

// ---- Budgets ---------------------------------------------------------------

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number;
}

export function budgetStatus(
  budgets: Budget[],
  txns: Transaction[],
  now = Date.now(),
): BudgetStatus[] {
  const monthTxns = inPeriod(txns, "month", now).filter((t) => t.kind === "expense");
  return budgets.map((b) => {
    const spent = monthTxns
      .filter((t) => t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    return {
      budget: b,
      spent,
      remaining: b.limit - spent,
      ratio: b.limit > 0 ? spent / b.limit : 0,
    };
  });
}

// ---- Category breakdown for charts ----------------------------------------

export function byCategory(
  txns: Transaction[],
  kind: Transaction["kind"],
): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of txns.filter((x) => x.kind === kind)) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Net cashflow bucketed by month for the last `months` months. */
export function monthlyCashflow(
  txns: Transaction[],
  months = 6,
  now = Date.now(),
): { label: string; income: number; expense: number; net: number }[] {
  const buckets: { label: string; income: number; expense: number; net: number }[] = [];
  const base = new Date(now);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const from = d.getTime();
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const slice = txns.filter((t) => t.timestamp >= from && t.timestamp < to);
    const income = slice.filter((t) => t.kind !== "expense").reduce((s, t) => s + t.amount, 0);
    const expense = slice.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      income,
      expense,
      net: income - expense,
    });
  }
  return buckets;
}
