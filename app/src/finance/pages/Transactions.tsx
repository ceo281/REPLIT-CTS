import { useMemo, useState } from "react";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, TopBar } from "../../ui/components";
import { listAccounts, listTransactions } from "../api";
import { TxContent } from "./Dashboard";
import { TransactionForm } from "./TransactionForm";
import type { Transaction, TxnKind } from "../types";

const FILTERS: { key: TxnKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expenses" },
  { key: "sale", label: "Sales" },
];

export function TransactionsPage() {
  const { dek } = useVault();
  const accounts = useAsync(() => listAccounts(dek), [dek]);
  const txns = useAsync(() => listTransactions(dek), [dek]);
  const [filter, setFilter] = useState<TxnKind | "all">("all");
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const tx = txns.data ?? [];
  const shown = useMemo(
    () => (filter === "all" ? tx : tx.filter((t) => t.kind === filter)),
    [tx, filter],
  );

  function reload() {
    txns.reload();
  }

  return (
    <div className="page">
      <TopBar eyebrow="Finance" title="Activity" />
      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <Empty>No transactions in this view.</Empty>
        ) : (
          <div className="list">
            {shown.map((t) => (
              <button key={t.id} className="row" onClick={() => setEditing(t)} style={{ cursor: "pointer" }}>
                <TxContent t={t} />
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add transaction">
        +
      </button>

      {(editing || adding) && (accounts.data?.length ?? 0) > 0 && (
        <TransactionForm
          dek={dek}
          accounts={accounts.data!}
          existing={editing}
          onClose={() => {
            setEditing(undefined);
            setAdding(false);
          }}
          onSaved={reload}
        />
      )}
    </div>
  );
}
