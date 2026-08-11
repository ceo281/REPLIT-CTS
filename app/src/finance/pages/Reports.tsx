import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, SectionHead, Stat, TopBar } from "../../ui/components";
import { money } from "../../ui/format";
import { listTransactions } from "../api";
import { byCategory, inPeriod, monthlyCashflow, totalsFor } from "../calc";
import type { Transaction } from "../types";

type Period = "month" | "year" | "all";

export function ReportsPage() {
  const { dek } = useVault();
  const txns = useAsync(() => listTransactions(dek), [dek]);
  const [period, setPeriod] = useState<Period>("month");

  const all = txns.data ?? [];
  const scoped: Transaction[] = period === "all" ? all : inPeriod(all, period);
  const totals = totalsFor(scoped);
  const cashflow = monthlyCashflow(all, 6);
  const expenseCats = byCategory(scoped, "expense").slice(0, 6);
  const maxCat = Math.max(1, ...expenseCats.map((c) => c.amount));

  return (
    <div className="page">
      <TopBar eyebrow="Finance" title="Reports" />

      <div className="seg" style={{ marginBottom: 16 }}>
        {(["month", "year", "all"] as Period[]).map((p) => (
          <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
            {p === "month" ? "This month" : p === "year" ? "This year" : "All time"}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <Stat k="Income" v={money(totals.income)} tone="pos" />
        <Stat k="Expenses" v={money(totals.expense)} tone="neg" />
        <Stat k="Sales" v={money(totals.sales)} />
        <Stat k="Net" v={money(totals.net)} tone={totals.net >= 0 ? "pos" : "neg"} />
      </div>

      <SectionHead title="Cashflow (6 months)" />
      <div className="card">
        {all.length === 0 ? (
          <Empty>No data yet.</Empty>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={cashflow} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--text-faint)" />
                <YAxis tickFormatter={(v) => (v / 100).toFixed(0)} tickLine={false} axisLine={false} fontSize={11} stroke="var(--text-faint)" width={44} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  formatter={(v: number) => money(v)}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="income" fill="var(--pos)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--neg)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <SectionHead title="Top expense categories" />
      <div className="card">
        {expenseCats.length === 0 ? (
          <Empty>No expenses in this period.</Empty>
        ) : (
          <div style={{ width: "100%", height: Math.max(120, expenseCats.length * 42) }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={expenseCats} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, maxCat]} />
                <YAxis type="category" dataKey="category" width={90} tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-dim)" />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  formatter={(v: number) => money(v)}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {expenseCats.map((_, i) => (
                    <Cell key={i} fill="var(--brand)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
