import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, SectionHead, Stat, TopBar } from "../../ui/components";
import { dateShort, dateTime, money, num } from "../../ui/format";
import { deletePerson, getPerson, listRecordsFor } from "../api";
import { totalsForPerson, withRunningTotals } from "../calc";
import { RecordForm } from "./RecordForm";
import type { PersonRecord } from "../types";

export function PersonDetailPage() {
  const { dek } = useVault();
  const { id = "" } = useParams();
  const nav = useNavigate();
  const person = useAsync(() => getPerson(dek, id), [dek, id]);
  const records = useAsync(() => listRecordsFor(dek, id), [dek, id]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PersonRecord | undefined>();

  const p = person.data;
  const recs = records.data ?? [];
  const totals = totalsForPerson(recs);
  const running = withRunningTotals(recs).reverse(); // newest first for display

  function reload() {
    person.reload();
    records.reload();
  }

  if (person.loading) return <div className="page"><TopBar title="…" onBack={() => nav(-1)} /></div>;
  if (!p) return <div className="page"><TopBar title="Not found" onBack={() => nav("/people/list")} /><Empty>This person no longer exists.</Empty></div>;

  return (
    <div className="page">
      <TopBar
        eyebrow="Private"
        title={p.displayName}
        onBack={() => nav("/people/list")}
        right={
          <button
            className="btn ghost small"
            style={{ color: "var(--neg)" }}
            onClick={async () => {
              if (confirm(`Delete ${p.displayName} and all their records?`)) {
                await deletePerson(dek, p.id);
                nav("/people/list");
              }
            }}
          >
            Delete
          </button>
        }
      />

      <div className="card hero">
        <div className="label">Total for {p.displayName}</div>
        <div className="value">{money(totals.totalAmount)}</div>
        <div className="label" style={{ marginTop: 8 }}>
          Since {p.createdAt ? dateShort(p.createdAt) : "—"}
        </div>
      </div>

      <div style={{ height: 12 }} />
      <div className="stat-grid">
        <Stat k="Records" v={num(totals.occurrences)} />
        <Stat k="Quantity" v={num(totals.totalQuantity)} />
        <Stat k="First record" v={totals.firstAt ? dateShort(totals.firstAt) : "—"} />
        <Stat k="Most recent" v={totals.lastAt ? dateShort(totals.lastAt) : "—"} />
      </div>

      {p.notes && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Notes</div>
          <div>{p.notes}</div>
        </div>
      )}

      <SectionHead title="History" />
      <div className="card">
        {recs.length === 0 ? (
          <Empty>No records yet. Tap + to add one.</Empty>
        ) : (
          <div className="list">
            {running.map((r) => (
              <button key={r.id} className="row" onClick={() => setEditing(r)} style={{ cursor: "pointer" }}>
                <div className="grow">
                  <div className="primary">
                    <span className="tag">{r.type}</span> {money(r.amount)}
                    {r.quantity ? ` · ${num(r.quantity)} qty` : ""}
                  </div>
                  <div className="secondary">
                    {dateTime(r.timestamp)}
                    {r.occurrence ? ` · ${r.occurrence}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amount">{money(r.runningAmount)}</div>
                  <div className="secondary">running</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add record">
        +
      </button>

      {adding && <RecordForm dek={dek} person={p} onClose={() => setAdding(false)} onSaved={reload} />}
      {editing && (
        <RecordForm dek={dek} person={p} existing={editing} onClose={() => setEditing(undefined)} onSaved={reload} />
      )}
    </div>
  );
}
