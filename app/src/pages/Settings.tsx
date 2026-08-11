import { useState } from "react";
import { useSession } from "../session/SessionContext";
import { provisionVault } from "../session/auth";
import { Field, SectionHead, Sheet, TopBar } from "../ui/components";
import {
  downloadFile,
  exportFinance,
  exportFinanceFull,
  exportFinanceSummary,
  exportPeopleAnonymized,
  exportPeopleFull,
  exportPeopleSummary,
} from "../exports/exporters";
import { createBackup, restoreBackup } from "../exports/backup";
import { listAccounts, listBudgets, listTransactions } from "../finance/api";
import { listAllRecords, listPeople } from "../people/api";

export function SettingsPage() {
  const { activeVault, dek, settings, updateSettings, lock, changePassphrase } = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | "passphrase" | "addPrivate" | "backup" | "restore">(null);
  const isFinance = activeVault === "finance";

  async function doExport(kind: string) {
    if (!dek || !activeVault) return;
    if (isFinance) {
      const [accounts, txns, budgets] = await Promise.all([
        listAccounts(dek),
        listTransactions(dek),
        listBudgets(dek),
      ]);
      if (kind === "full") downloadFile(exportFinanceFull(accounts, txns, budgets));
      if (kind === "finance") downloadFile(exportFinance(accounts, txns));
      if (kind === "summary") downloadFile(exportFinanceSummary(accounts, txns));
    } else {
      const [people, records] = await Promise.all([listPeople(dek), listAllRecords(dek)]);
      if (kind === "full") downloadFile(exportPeopleFull(people, records));
      if (kind === "summary") downloadFile(exportPeopleSummary(people, records));
      if (kind === "anon") downloadFile(exportPeopleAnonymized(people, records));
    }
    flash("Export downloaded.");
  }

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <div className="page">
      <TopBar eyebrow={isFinance ? "Finance" : "Private"} title="Settings" />

      {msg && <div className="card" style={{ borderColor: "var(--pos)", color: "var(--pos)" }}>{msg}</div>}

      <SectionHead title="Appearance" />
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Theme</label>
          <div className="seg">
            {(["system", "light", "dark"] as const).map((t) => (
              <button key={t} className={settings.theme === t ? "on" : ""} onClick={() => updateSettings({ theme: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SectionHead title="Security" />
      <div className="card">
        <Field label={`Auto-lock after inactivity: ${settings.inactivityLockSeconds}s`}>
          <input
            type="range"
            min={30}
            max={600}
            step={30}
            value={settings.inactivityLockSeconds}
            onChange={(e) => updateSettings({ inactivityLockSeconds: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </Field>
        <Toggle
          label="Lock private vault when app is backgrounded"
          on={settings.lockPrivateOnBackground}
          onChange={(v) => updateSettings({ lockPrivateOnBackground: v })}
        />
        <Toggle
          label="Lock finance vault when app is backgrounded"
          on={settings.lockFinanceOnBackground}
          onChange={(v) => updateSettings({ lockFinanceOnBackground: v })}
        />
        <Toggle
          label="Lock on external device connection"
          on={settings.lockOnComputerConnection}
          onChange={(v) => updateSettings({ lockOnComputerConnection: v })}
        />
        <div className="divider" />
        <button className="btn block" onClick={() => setSheet("passphrase")}>Change this vault's passphrase</button>
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => lock("Locked manually.")}>Lock now</button>
      </div>

      {isFinance && (
        <>
          <SectionHead title="Private workspace" />
          <div className="card">
            <p className="small muted" style={{ marginTop: 0 }}>
              Add a second, independently-encrypted workspace with its own passphrase.
              It uses a separate key — unlocking finance never decrypts it.
            </p>
            <button className="btn block" onClick={() => setSheet("addPrivate")}>Add private workspace</button>
          </div>
        </>
      )}

      <SectionHead title="Export" />
      <div className="card">
        {isFinance ? (
          <>
            <ExportRow label="Full export" desc="Everything in this workspace (JSON)" onClick={() => doExport("full")} />
            <ExportRow label="Finance export" desc="Transactions without notes (CSV)" onClick={() => doExport("finance")} />
            <ExportRow label="Summary export" desc="Totals and balances only" onClick={() => doExport("summary")} />
          </>
        ) : (
          <>
            <ExportRow label="Full export" desc="All people and records (JSON)" onClick={() => doExport("full")} />
            <ExportRow label="Summary export" desc="Per-person and overall totals" onClick={() => doExport("summary")} />
            <ExportRow label="Anonymized export" desc="Names replaced with random ids, notes stripped" onClick={() => doExport("anon")} />
          </>
        )}
      </div>

      <SectionHead title="Encrypted backup" />
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          A backup is sealed under a separate backup passphrase — never a plaintext
          copy. Restoring re-installs the encrypted vault, which you then open with
          its own passphrase.
        </p>
        <button className="btn block" onClick={() => setSheet("backup")}>Create encrypted backup</button>
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setSheet("restore")}>Restore from backup</button>
      </div>

      <div style={{ height: 24 }} />
      <p className="small muted" style={{ textAlign: "center" }}>
        Data is encrypted locally with AES-256-GCM and Argon2id. See SECURITY.md for
        the threat model and its limits.
      </p>

      {sheet === "passphrase" && activeVault && (
        <ChangePassphraseSheet
          onClose={() => setSheet(null)}
          onSubmit={async (oldP, newP) => {
            const ok = await changePassphrase(activeVault, oldP, newP);
            if (ok) {
              flash("Passphrase updated.");
              setSheet(null);
            }
            return ok;
          }}
        />
      )}
      {sheet === "addPrivate" && (
        <AddPrivateSheet
          onClose={() => setSheet(null)}
          onSubmit={async (pw) => {
            const r = await provisionVault("private", pw);
            if (r.ok) flash("Private workspace created. Lock, then unlock with its passphrase.");
            setSheet(null);
            return r;
          }}
        />
      )}
      {sheet === "backup" && activeVault && (
        <BackupSheet
          onClose={() => setSheet(null)}
          onSubmit={async (pw) => {
            const b = await createBackup(activeVault, pw);
            if (b) {
              downloadFile({ filename: b.filename, mime: "application/json", content: b.content });
              flash("Encrypted backup downloaded.");
            }
            setSheet(null);
          }}
        />
      )}
      {sheet === "restore" && (
        <RestoreSheet
          onClose={() => setSheet(null)}
          onResult={(m) => {
            flash(m);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="row"
      style={{ cursor: "pointer", justifyContent: "space-between" }}
      onClick={() => onChange(!on)}
    >
      <span className="grow">{label}</span>
      <span
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          background: on ? "var(--brand)" : "var(--surface-2)",
          position: "relative",
          transition: "background .15s",
          flex: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s",
            boxShadow: "0 1px 2px rgba(0,0,0,.3)",
          }}
        />
      </span>
    </button>
  );
}

function ExportRow({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button className="row" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="grow">
        <div className="primary">{label}</div>
        <div className="secondary">{desc}</div>
      </div>
      <span className="muted">Download</span>
    </button>
  );
}

function ChangePassphraseSheet({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (oldP: string, newP: string) => Promise<boolean>;
}) {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Change passphrase" onClose={onClose}>
      <Field label="Current passphrase">
        <input className="input" type="password" value={oldP} onChange={(e) => setOldP(e.target.value)} />
      </Field>
      <Field label="New passphrase">
        <input className="input" type="password" value={newP} onChange={(e) => setNewP(e.target.value)} />
      </Field>
      <Field label="Confirm new passphrase">
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <div className="error-text">{err}</div>
      <button
        className="btn primary block"
        disabled={busy}
        onClick={async () => {
          setErr("");
          if (newP.length < 8) return setErr("New passphrase must be at least 8 characters.");
          if (newP !== confirm) return setErr("New passphrases do not match.");
          setBusy(true);
          const ok = await onSubmit(oldP, newP);
          setBusy(false);
          if (!ok) setErr("Current passphrase is incorrect.");
        }}
      >
        {busy ? "Updating…" : "Update passphrase"}
      </button>
    </Sheet>
  );
}

function AddPrivateSheet({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (pw: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Add private workspace" onClose={onClose}>
      <Field label="Private passphrase">
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Confirm passphrase">
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <div className="error-text">{err}</div>
      <button
        className="btn primary block"
        disabled={busy}
        onClick={async () => {
          setErr("");
          if (pw.length < 8) return setErr("Use at least 8 characters.");
          if (pw !== confirm) return setErr("Passphrases do not match.");
          setBusy(true);
          const r = await onSubmit(pw);
          setBusy(false);
          if (!r.ok) setErr(r.error === "passphrase-collision" ? "That passphrase already opens another workspace." : "Could not create workspace.");
        }}
      >
        {busy ? "Creating…" : "Create private workspace"}
      </button>
    </Sheet>
  );
}

function BackupSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Create encrypted backup" onClose={onClose}>
      <Field label="Backup passphrase (separate from your vault)">
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Confirm backup passphrase">
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <div className="error-text">{err}</div>
      <button
        className="btn primary block"
        disabled={busy}
        onClick={async () => {
          setErr("");
          if (pw.length < 8) return setErr("Use at least 8 characters.");
          if (pw !== confirm) return setErr("Passphrases do not match.");
          setBusy(true);
          await onSubmit(pw);
          setBusy(false);
        }}
      >
        {busy ? "Encrypting…" : "Download backup"}
      </button>
    </Sheet>
  );
}

function RestoreSheet({ onClose, onResult }: { onClose: () => void; onResult: (m: string) => void }) {
  const [pw, setPw] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Restore from backup" onClose={onClose}>
      <Field label="Backup file">
        <input
          className="input"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileName(file.name);
            setText(await file.text());
          }}
        />
      </Field>
      {fileName && <div className="small muted" style={{ marginBottom: 10 }}>Loaded {fileName}</div>}
      <Field label="Backup passphrase">
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <div className="error-text">{err}</div>
      <button
        className="btn primary block"
        disabled={busy || !text}
        onClick={async () => {
          setErr("");
          setBusy(true);
          const r = await restoreBackup(text, pw);
          setBusy(false);
          if (r.ok) onResult(`Restored ${r.rowCount ?? 0} records. Lock and unlock with the vault passphrase.`);
          else setErr(r.error === "wrong-passphrase" ? "Wrong backup passphrase." : "Not a valid backup file.");
        }}
      >
        {busy ? "Restoring…" : "Restore"}
      </button>
    </Sheet>
  );
}
