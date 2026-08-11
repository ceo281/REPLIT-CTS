import { useState } from "react";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, Field, SectionHead, Sheet, Stat, TopBar } from "../../ui/components";
import { dateShort, money, num, parseMoney } from "../../ui/format";
import { createAccount, listAccounts, listTransactions } from "../api";
import { accountBalance, inPeriod, totalBalance, totalsFor } from "../calc";
import { TransactionForm } from "./TransactionForm";
import type { Transaction } from "../types";

export function FinanceDashboard() {
  const { dek } = useVault();
  const accounts = useAsync(() => listAccounts(dek), [dek]);
  const txns = useAsync(() => listTransactions(dek), [dek]);
  const [showTxn, setShowTxn] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const acc = accounts.data ?? [];
  const tx = txns.data ?? [];
  const monthTx = inPeriod(tx, "month");
  const totals = totalsFor(monthTx);

  function reload() {
    accounts.reload();
    txns.reload();
  }

  return (
    <div className="page">
      <TopBar eyebrow="Finance" title="Overview" />

      <div className="card hero">
        <div className="label">Total balance</div>
        <div className="value">{money(totalBalance(acc, tx))}</div>
        <div className="label" style={{ marginTop: 8 }}>
          {acc.length} account{acc.length === 1 ? "" : "s"} · {tx.length} transactions
        </div>
      </div>

      <div style={{ height: 12 }} />
      <div className="stat-grid">
        <Stat k="Income (month)" v={money(totals.income)} tone="pos" />
        <Stat k="Expenses (month)" v={money(totals.expense)} tone="neg" />
        <Stat k="Sales (month)" v={money(totals.sales)} />
        <Stat k="Net (month)" v={money(totals.net)} tone={totals.net >= 0 ? "pos" : "neg"} />
      </div>

      <SectionHead
        title="Accounts"
        action={
          <button className="link btn ghost" style={{ padding: 0 }} onClick={() => setShowAccount(true)}>
            + Add
          </button>
        }
      />
      <div className="card">
        {acc.length === 0 ? (
          <Empty>
            No accounts yet.
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => setShowAccount(true)}>
                Create your first account
              </button>
            </div>
          </Empty>
        ) : (
          <div className="list">
            {acc.map((a) => (
              <div className="row" key={a.id}>
                <div className="avatar">{a.name[0]?.toUpperCase()}</div>
                <div className="grow">
                  <div className="primary">{a.name}</div>
                  <div className="secondary">Opened {dateShort(a.createdAt)}</div>
                </div>
                <div className="amount">{money(accountBalance(a, tx))}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionHead title="Recent activity" />
      <div className="card">
        {tx.length === 0 ? (
          <Empty>No transactions yet. Tap + to add one.</Empty>
        ) : (
          <div className="list">
            {tx.slice(0, 6).map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => (acc.length ? setShowTxn(true) : setShowAccount(true))} aria-label="Add transaction">
        +
      </button>

      {showTxn && (
        <TransactionForm dek={dek} accounts={acc} onClose={() => setShowTxn(false)} onSaved={reload} />
      )}
      {showAccount && (
        <AccountForm
          onClose={() => setShowAccount(false)}
          onSave={async (name, opening) => {
            await createAccount(dek, { name, openingBalance: opening });
            reload();
          }}
        />
      )}
    </div>
  );
}

export function TxContent({ t }: { t: Transaction }) {
  const sign = t.kind === "expense" ? -1 : 1;
  return (
    <>
      <div className="avatar" style={{ color: t.kind === "expense" ? "var(--neg)" : "var(--pos)" }}>
        {t.kind === "income" ? "↓" : t.kind === "expense" ? "↑" : "$"}
      </div>
      <div className="grow">
        <div className="primary">{t.category}</div>
        <div className="secondary">
          {dateShort(t.timestamp)}
          {t.kind === "sale" && t.quantity ? ` · ${num(t.quantity)} units` : ""}
          {t.note ? ` · ${t.note}` : ""}
        </div>
      </div>
      <div className="amount" style={{ color: sign < 0 ? "var(--neg)" : "var(--pos)" }}>
        {sign < 0 ? "-" : "+"}
        {money(t.amount)}
      </div>
    </>
  );
}

export function TxRow({ t }: { t: Transaction }) {
  return (
    <div className="row">
      <TxContent t={t} />
    </div>
  );
}

function AccountForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, opening: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  return (
    <Sheet title="New account" onClose={onClose}>
      <Field label="Account name">
        <input className="input" autoFocus value={name} placeholder="Cash, Bank, Card…" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Opening balance">
        <input className="input" inputMode="decimal" placeholder="0.00" value={opening} onChange={(e) => setOpening(e.target.value)} />
      </Field>
      <button
        className="btn primary block"
        disabled={!name.trim()}
        onClick={async () => {
          await onSave(name.trim(), parseMoney(opening));
          onClose();
        }}
      >
        Create account
      </button>
    </Sheet>
  );
}
