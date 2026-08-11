import { useEffect, useState } from "react";
import { useSession } from "../session/SessionContext";
import { IconLock } from "../ui/icons";

export function LockScreen() {
  const { unlock, lastLockReason } = useSession();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1000)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit() {
    if (busy || cooldown > 0) return;
    setErr("");
    setBusy(true);
    const r = await unlock(pw);
    setBusy(false);
    if (!r.ok) {
      setPw("");
      if (r.retryInMs && r.retryInMs > 0) {
        setCooldown(r.retryInMs);
        setErr(`Too many attempts. Try again shortly.`);
      } else {
        setErr("Incorrect passphrase.");
      }
    }
  }

  return (
    <div className="gate">
      <div className="brand-mark">
        <IconLock width={26} height={26} />
      </div>
      <h1>Locked</h1>
      <p>{lastLockReason ?? "Enter your passphrase to continue."}</p>
      <div style={{ height: 18 }} />
      <input
        className="input"
        type="password"
        autoComplete="current-password"
        value={pw}
        autoFocus
        placeholder="Passphrase"
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="error-text">
        {cooldown > 0 ? `Locked out for ${Math.ceil(cooldown / 1000)}s` : err}
      </div>
      <button className="btn primary block" disabled={busy || cooldown > 0 || !pw} onClick={submit}>
        {busy ? "Verifying…" : "Unlock"}
      </button>
      <p className="small muted" style={{ marginTop: 16 }}>
        The passphrase you enter determines which workspace opens. Each workspace
        is encrypted with its own key.
      </p>
    </div>
  );
}
