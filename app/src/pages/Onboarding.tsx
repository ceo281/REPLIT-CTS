import { useState } from "react";
import { useSession } from "../session/SessionContext";
import { Field } from "../ui/components";

export function Onboarding() {
  const { provision } = useSession();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const weak = pw.length > 0 && pw.length < 8;

  async function submit() {
    setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== confirm) return setErr("Passphrases do not match.");
    setBusy(true);
    const r = await provision("finance", pw);
    setBusy(false);
    if (!r.ok) setErr("Could not create the vault. Please try again.");
  }

  return (
    <div className="gate">
      <div className="brand-mark">₤</div>
      <h1>Set up Ledger</h1>
      <p>
        Create a passphrase for your finance workspace. Your data is encrypted on
        this device with a key derived from this passphrase — it is never stored
        and cannot be recovered if lost.
      </p>
      <div style={{ height: 18 }} />
      <Field label="Passphrase">
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 8 characters"
        />
      </Field>
      <Field label="Confirm passphrase">
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Field>
      {weak && <div className="small muted">A longer passphrase is much harder to attack offline.</div>}
      <div className="error-text">{err}</div>
      <button className="btn primary block" disabled={busy} onClick={submit}>
        {busy ? "Encrypting…" : "Create workspace"}
      </button>
      <p className="small muted" style={{ marginTop: 16 }}>
        You can add a separate, independently-encrypted private workspace later in
        Settings.
      </p>
    </div>
  );
}
