import { useState } from "react";
import { Field, Sheet } from "../../ui/components";
import { fromDatetimeLocal, parseMoney, toDatetimeLocal } from "../../ui/format";
import { deleteTransaction, newTransaction, saveTransaction } from "../api";
import type { Account, Transaction, TxnKind } from "../types";

const CATEGORIES: Record<TxnKind, string[]> = {
  income: ["Salary", "Interest", "Refund", "Other"],
  expense: ["Groceries", "Rent", "Transport", "Utilities", "Supplies", "Other"],
  sale: ["Goods", "Service", "Other"],
};

export function TransactionForm({
  dek,
  accounts,
  existing,
  defaultAccountId,
  onClose,
  onSaved,
}: {
  dek: CryptoKey;
  accounts: Account[];
  existing?: Transaction;
  defaultAccountId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<TxnKind>(existing?.kind ?? "expense");
  const [amount, setAmount] = useState(existing ? (existing.amount / 100).toString() : "");
  const [quantity, setQuantity] = useState(existing?.quantity?.toString() ?? "");
  const [category, setCategory] = useState(existing?.category ?? "Groceries");
  const [accountId, setAccountId] = useState(existing?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [when, setWhen] = useState(toDatetimeLocal(existing?.timestamp ?? Date.now()));
  const [busy, setBusy] = useState(false);

  async function save() {
    const cents = parseMoney(amount);
    if (cents <= 0 || !accountId) return;
    setBusy(true);
    const base = {
      accountId,
      kind,
      amount: cents,
      quantity: kind === "sale" && quantity ? Number(quantity) : undefined,
      category,
      note: note.trim() || undefined,
      timestamp: fromDatetimeLocal(when),
    };
    if (existing) {
      await saveTransaction(dek, { ...existing, ...base });
    } else {
      await newTransaction(dek, base);
    }
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <Sheet title={existing ? "Edit transaction" : "New transaction"} onClose={onClose}>
      <div className="seg" style={{ marginBottom: 16 }}>
        {(["expense", "income", "sale"] as TxnKind[]).map((k) => (
          <button
            key={k}
            className={kind === k ? "on" : ""}
            onClick={() => {
              setKind(k);
              setCategory(CATEGORIES[k][0]);
            }}
          >
            {k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <Field label="Amount">
        <input
          className="input"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          autoFocus
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      {kind === "sale" && (
        <Field label="Quantity">
          <input
            className="input"
            inputMode="numeric"
            placeholder="Units sold"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
      )}

      <Field label="Account">
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Category">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES[kind].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Date & time">
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>

      <Field label="Note (optional)">
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <button className="btn primary block" disabled={busy || parseMoney(amount) <= 0} onClick={save}>
        {busy ? "Saving…" : "Save transaction"}
      </button>
      {existing && (
        <button
          className="btn danger block"
          style={{ marginTop: 10 }}
          onClick={async () => {
            await deleteTransaction(dek, existing.id);
            onSaved();
            onClose();
          }}
        >
          Delete
        </button>
      )}
    </Sheet>
  );
}
