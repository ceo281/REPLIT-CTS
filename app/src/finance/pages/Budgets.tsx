import { useState } from "react";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, Field, SectionHead, Sheet, TopBar } from "../../ui/components";
import { money, parseMoney } from "../../ui/format";
import { deleteBudget, listBudgets, listTransactions, newBudget } from "../api";
import { budgetStatus } from "../calc";

export function BudgetsPage() {
  const { dek } = useVault();
  const budgets = useAsync(() => listBudgets(dek), [dek]);
  const txns = useAsync(() => listTransactions(dek), [dek]);
  const [adding, setAdding] = useState(false);

  const statuses = budgetStatus(budgets.data ?? [], txns.data ?? []);

  return (
    <div className="page">
      <TopBar eyebrow="Finance" title="Budgets" />
      <SectionHead
        title="Monthly limits"
        action={
          <button className="btn ghost" style={{ padding: 0 }} onClick={() => setAdding(true)}>
            + Add
          </button>
        }
      />

      {statuses.length === 0 ? (
        <div className="card">
          <Empty>
            Set a monthly spending limit per category to track your budget.
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => setAdding(true)}>
                Create a budget
              </button>
            </div>
          </Empty>
        </div>
      ) : (
        statuses.map((s) => {
          const pct = Math.min(100, Math.round(s.ratio * 100));
          const over = s.spent > s.budget.limit;
          return (
            <div className="card" key={s.budget.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{s.budget.category}</strong>
                <button
                  className="btn ghost small"
                  style={{ padding: 0, color: "var(--text-faint)" }}
                  onClick={async () => {
                    await deleteBudget(dek, s.budget.id);
                    budgets.reload();
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="small muted" style={{ marginTop: 2 }}>
                {money(s.spent)} of {money(s.budget.limit)} · {over ? "over by " + money(-s.remaining) : money(s.remaining) + " left"}
              </div>
              <div className="bar-track">
                <div className={`bar-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })
      )}

      {adding && (
        <BudgetForm
          onClose={() => setAdding(false)}
          onSave={async (category, limit) => {
            await newBudget(dek, { category, limit });
            budgets.reload();
          }}
        />
      )}
    </div>
  );
}

function BudgetForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (category: string, limit: number) => Promise<void>;
}) {
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  return (
    <Sheet title="New budget" onClose={onClose}>
      <Field label="Category">
        <input className="input" autoFocus value={category} placeholder="e.g. Groceries" onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <Field label="Monthly limit">
        <input className="input" inputMode="decimal" placeholder="0.00" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <button
        className="btn primary block"
        disabled={!category.trim() || parseMoney(limit) <= 0}
        onClick={async () => {
          await onSave(category.trim(), parseMoney(limit));
          onClose();
        }}
      >
        Save budget
      </button>
    </Sheet>
  );
}
