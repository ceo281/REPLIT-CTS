import { useEffect, type ReactNode } from "react";
import { IconBack } from "./icons";

export function TopBar({
  title,
  eyebrow,
  right,
  onBack,
}: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {onBack && (
          <button className="btn ghost" style={{ padding: 6 }} onClick={onBack} aria-label="Back">
            <IconBack width={22} height={22} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
        </div>
      </div>
      {right}
    </div>
  );
}

export function Stat({
  k,
  v,
  tone,
}: {
  k: string;
  v: ReactNode;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className={`v ${tone ?? ""}`}>{v}</div>
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
