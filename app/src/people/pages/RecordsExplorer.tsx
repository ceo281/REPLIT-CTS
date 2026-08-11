import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../../session/SessionContext";
import { useAsync } from "../../ui/hooks";
import { Empty, Field, SectionHead, Sheet, Stat, TopBar } from "../../ui/components";
import { money, num, parseMoney } from "../../ui/format";
import { listAllRecords, listPeople, listRecordTypes } from "../api";
import {
  filterRecords,
  periodRange,
  totalsForPerson,
  type PresetPeriod,
  type RecordFilter,
} from "../calc";
import { RecordRow } from "./Dashboard";

const PERIODS: { key: PresetPeriod; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export function RecordsExplorer() {
  const { dek } = useVault();
  const nav = useNavigate();
  const people = useAsync(() => listPeople(dek), [dek]);
  const records = useAsync(() => listAllRecords(dek), [dek]);
  const [types, setTypes] = useState<string[]>([]);
  const [period, setPeriod] = useState<PresetPeriod>("all");
  const [filter, setFilter] = useState<RecordFilter>({});
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    listRecordTypes(dek).then(setTypes);
  }, [dek]);

  const ppl = people.data ?? [];
  const recs = records.data ?? [];
  const nameOf = useMemo(() => new Map(ppl.map((p) => [p.id, p.displayName])), [ppl]);

  const shown = useMemo(() => {
    const range = periodRange(period);
    return filterRecords(recs, { ...filter, ...range });
  }, [recs, filter, period]);

  const totals = totalsForPerson(shown);
  const activeFilterCount =
    Object.values(filter).filter((v) => v !== undefined && v !== "").length;

  return (
    <div className="page">
      <TopBar
        eyebrow="Private"
        title="Records"
        right={
          <button className="btn ghost" onClick={() => setShowFilter(true)}>
            Filter{activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </button>
        }
      />

      <div className="chips" style={{ marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button key={p.key} className={`chip ${period === p.key ? "on" : ""}`} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <Stat k="Matched" v={num(shown.length)} />
        <Stat k="Amount" v={money(totals.totalAmount)} />
        <Stat k="Quantity" v={num(totals.totalQuantity)} />
        <Stat k="People" v={num(new Set(shown.map((r) => r.personId)).size)} />
      </div>

      <SectionHead title="Results" />
      <div className="card">
        {shown.length === 0 ? (
          <Empty>No records match these filters.</Empty>
        ) : (
          <div className="list">
            {shown.map((r) => (
              <RecordRow key={r.id} r={r} name={nameOf.get(r.personId) ?? "Unknown"} onClick={() => nav(`/people/person/${r.personId}`)} />
            ))}
          </div>
        )}
      </div>

      {showFilter && (
        <FilterSheet
          people={ppl}
          types={types}
          value={filter}
          onClose={() => setShowFilter(false)}
          onApply={(f) => {
            setFilter(f);
            setShowFilter(false);
          }}
        />
      )}
    </div>
  );
}

function FilterSheet({
  people,
  types,
  value,
  onClose,
  onApply,
}: {
  people: { id: string; displayName: string }[];
  types: string[];
  value: RecordFilter;
  onClose: () => void;
  onApply: (f: RecordFilter) => void;
}) {
  const [f, setF] = useState<RecordFilter>(value);
  const set = (patch: Partial<RecordFilter>) => setF((prev) => ({ ...prev, ...patch }));

  return (
    <Sheet title="Filter records" onClose={onClose}>
      <Field label="Person">
        <select className="input" value={f.personId ?? ""} onChange={(e) => set({ personId: e.target.value || undefined })}>
          <option value="">Anyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Record type">
        <select className="input" value={f.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })}>
          <option value="">Any type</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Min amount">
          <input className="input" inputMode="decimal" onChange={(e) => set({ minAmount: e.target.value ? parseMoney(e.target.value) : undefined })} />
        </Field>
        <Field label="Max amount">
          <input className="input" inputMode="decimal" onChange={(e) => set({ maxAmount: e.target.value ? parseMoney(e.target.value) : undefined })} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Min qty">
          <input className="input" inputMode="numeric" onChange={(e) => set({ minQuantity: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label="Max qty">
          <input className="input" inputMode="numeric" onChange={(e) => set({ maxQuantity: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
      </div>
      <Field label="Text (note / occurrence / type)">
        <input className="input" value={f.text ?? ""} onChange={(e) => set({ text: e.target.value || undefined })} />
      </Field>
      <button className="btn primary block" onClick={() => onApply(f)}>
        Apply filters
      </button>
      <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => onApply({})}>
        Clear all
      </button>
    </Sheet>
  );
}
