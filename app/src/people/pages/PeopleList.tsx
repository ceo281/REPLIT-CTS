import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, Field, Sheet, TopBar } from "../../ui/components";
import { initials, money, num, relative } from "../../ui/format";
import { IconSearch } from "../../ui/icons";
import { createPerson, listAllRecords, listPeople } from "../api";
import { totalsForPerson } from "../calc";

export function PeopleListPage() {
  const { dek } = useVault();
  const nav = useNavigate();
  const people = useAsync(() => listPeople(dek), [dek]);
  const records = useAsync(() => listAllRecords(dek), [dek]);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const ppl = people.data ?? [];
  const recs = records.data ?? [];

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ppl
      .filter((p) => !needle || p.displayName.toLowerCase().includes(needle))
      .map((p) => ({ person: p, totals: totalsForPerson(recs.filter((r) => r.personId === p.id)) }));
  }, [ppl, recs, q]);

  return (
    <div className="page">
      <TopBar eyebrow="Private" title="People" />

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <IconSearch width={18} height={18} style={{ color: "var(--text-faint)" }} />
        <input
          className="input"
          style={{ border: "none", background: "transparent", padding: 0 }}
          placeholder="Search people"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={{ height: 12 }} />
      <div className="card">
        {rows.length === 0 ? (
          <Empty>
            {ppl.length === 0 ? "No people yet." : "No matches."}
            {ppl.length === 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn primary" onClick={() => setAdding(true)}>
                  Add your first person
                </button>
              </div>
            )}
          </Empty>
        ) : (
          <div className="list">
            {rows.map(({ person, totals }) => (
              <button key={person.id} className="row" onClick={() => nav(`/people/person/${person.id}`)} style={{ cursor: "pointer" }}>
                <div className="avatar">{initials(person.displayName)}</div>
                <div className="grow">
                  <div className="primary">{person.displayName}</div>
                  <div className="secondary">
                    {num(totals.occurrences)} records · {num(totals.totalQuantity)} qty
                    {totals.lastAt ? ` · ${relative(totals.lastAt)}` : ""}
                  </div>
                </div>
                <div className="amount">{money(totals.totalAmount)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add person">
        +
      </button>

      {adding && (
        <PersonForm
          onClose={() => setAdding(false)}
          onSave={async (name, notes) => {
            const p = await createPerson(dek, { displayName: name, notes });
            people.reload();
            nav(`/people/person/${p.id}`);
          }}
        />
      )}
    </div>
  );
}

function PersonForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, notes?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Sheet title="New person" onClose={onClose}>
      <Field label="Name or identifier">
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or chosen identifier" />
      </Field>
      <Field label="Notes (optional)">
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button className="btn primary block" disabled={!name.trim()} onClick={() => onSave(name.trim(), notes.trim() || undefined)}>
        Add person
      </button>
    </Sheet>
  );
}
