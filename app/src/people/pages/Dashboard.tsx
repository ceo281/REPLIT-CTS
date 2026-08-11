import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, SectionHead, Stat, TopBar } from "../../ui/components";
import { dateTime, initials, money, num } from "../../ui/format";
import { listAllRecords, listPeople } from "../api";
import { filterRecords, overallTotals, periodRange, totalsForPerson, type PresetPeriod } from "../calc";
import { RecordForm } from "./RecordForm";
import type { PersonRecord } from "../types";

const PERIODS: { key: PresetPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
];

export function PeopleDashboard() {
  const { dek } = useVault();
  const nav = useNavigate();
  const people = useAsync(() => listPeople(dek), [dek]);
  const records = useAsync(() => listAllRecords(dek), [dek]);
  const [period, setPeriod] = useState<PresetPeriod>("month");
  const [adding, setAdding] = useState(false);

  const ppl = people.data ?? [];
  const recs = records.data ?? [];
  const nameOf = useMemo(() => new Map(ppl.map((p) => [p.id, p.displayName])), [ppl]);

  const overall = overallTotals(ppl, recs);
  const range = periodRange(period);
  const scoped = filterRecords(recs, range);
  const periodTotals = totalsForPerson(scoped);

  function reload() {
    people.reload();
    records.reload();
  }

  return (
    <div className="page">
      <TopBar eyebrow="Private" title="Overview" />

      <div className="card hero">
        <div className="label">Total recorded</div>
        <div className="value">{money(overall.totalAmount)}</div>
        <div className="label" style={{ marginTop: 8 }}>
          {num(overall.people)} people · {num(overall.records)} records · {num(overall.totalQuantity)} qty
        </div>
      </div>

      <SectionHead title="Period totals" />
      <div className="chips" style={{ marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button key={p.key} className={`chip ${period === p.key ? "on" : ""}`} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="stat-grid">
        <Stat k="Amount" v={money(periodTotals.totalAmount)} />
        <Stat k="Quantity" v={num(periodTotals.totalQuantity)} />
        <Stat k="Occurrences" v={num(periodTotals.occurrences)} />
        <Stat k="People active" v={num(new Set(scoped.map((r) => r.personId)).size)} />
      </div>

      <SectionHead title="Recent activity" action={<button className="btn ghost" style={{ padding: 0 }} onClick={() => nav("/people/records")}>View all</button>} />
      <div className="card">
        {recs.length === 0 ? (
          <Empty>No records yet. Tap + to log one.</Empty>
        ) : (
          <div className="list">
            {recs.slice(0, 6).map((r) => (
              <RecordRow key={r.id} r={r} name={nameOf.get(r.personId) ?? "Unknown"} onClick={() => nav(`/people/person/${r.personId}`)} />
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => (ppl.length ? setAdding(true) : nav("/people/list"))} aria-label="Add record">
        +
      </button>

      {adding && ppl.length > 0 && (
        <RecordForm dek={dek} people={ppl} onClose={() => setAdding(false)} onSaved={reload} />
      )}
    </div>
  );
}

export function RecordRow({
  r,
  name,
  onClick,
}: {
  r: PersonRecord;
  name: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="avatar">{initials(name)}</div>
      <div className="grow">
        <div className="primary">{name}</div>
        <div className="secondary">
          <span className="tag">{r.type}</span> {dateTime(r.timestamp)}
          {r.occurrence ? ` · ${r.occurrence}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="amount">{money(r.amount)}</div>
        {r.quantity ? <div className="secondary">{num(r.quantity)} qty</div> : null}
      </div>
    </>
  );
  return onClick ? (
    <button className="row" onClick={onClick} style={{ cursor: "pointer" }}>
      {inner}
    </button>
  ) : (
    <div className="row">{inner}</div>
  );
}
