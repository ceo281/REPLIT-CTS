import { useEffect, useState } from "react";
import { Field, Sheet } from "../../ui/components";
import { fromDatetimeLocal, parseMoney, toDatetimeLocal } from "../../ui/format";
import { addRecordType, deleteRecordById, listRecordTypes, newRecord, saveRecord } from "../api";
import type { Person, PersonRecord } from "../types";

export function RecordForm({
  dek,
  person,
  people,
  existing,
  onClose,
  onSaved,
}: {
  dek: CryptoKey;
  person?: Person;
  people?: Person[];
  existing?: PersonRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [types, setTypes] = useState<string[]>([]);
  const [personId, setPersonId] = useState(existing?.personId ?? person?.id ?? people?.[0]?.id ?? "");
  const [type, setType] = useState(existing?.type ?? "sale");
  const [amount, setAmount] = useState(existing ? (existing.amount / 100).toString() : "");
  const [quantity, setQuantity] = useState(existing?.quantity?.toString() ?? "1");
  const [occurrence, setOccurrence] = useState(existing?.occurrence ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [when, setWhen] = useState(toDatetimeLocal(existing?.timestamp ?? Date.now()));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRecordTypes(dek).then(setTypes);
  }, [dek]);

  async function save() {
    if (!personId) return;
    setBusy(true);
    const base = {
      personId,
      type,
      amount: parseMoney(amount),
      quantity: Number(quantity) || 0,
      occurrence: occurrence.trim() || undefined,
      note: note.trim() || undefined,
      timestamp: fromDatetimeLocal(when),
    };
    if (existing) await saveRecord(dek, { ...existing, ...base });
    else await newRecord(dek, base);
    setBusy(false);
    onSaved();
    onClose();
  }

  async function addType() {
    const label = prompt("New record type");
    if (label?.trim()) {
      await addRecordType(dek, label.trim());
      const next = await listRecordTypes(dek);
      setTypes(next);
      setType(label.trim());
    }
  }

  return (
    <Sheet title={existing ? "Edit record" : "New record"} onClose={onClose}>
      {people && !person && (
        <Field label="Person">
          <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Record type">
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 1 }}>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button className="btn ghost" onClick={addType} type="button">
            + Type
          </button>
        </div>
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Amount">
          <input className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Quantity">
          <input className="input" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </div>

      <Field label="Occurrence / event (optional)">
        <input className="input" value={occurrence} placeholder="e.g. Market day" onChange={(e) => setOccurrence(e.target.value)} />
      </Field>

      <Field label="Date & time">
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>

      <Field label="Note (optional)">
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <button className="btn primary block" disabled={busy || !personId} onClick={save}>
        {busy ? "Saving…" : "Save record"}
      </button>
      {existing && (
        <button
          className="btn danger block"
          style={{ marginTop: 10 }}
          onClick={async () => {
            await deleteRecordById(dek, existing.id);
            onSaved();
            onClose();
          }}
        >
          Delete record
        </button>
      )}
    </Sheet>
  );
}
