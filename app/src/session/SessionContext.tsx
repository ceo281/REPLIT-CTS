import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { VaultKind } from "../crypto/vault";
import {
  anyVaultExists,
  provisionVault,
  unlockAttempt,
  updatePassphrase,
} from "./auth";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "./settings";

type Status = "loading" | "onboarding" | "locked" | "unlocked";

interface SessionValue {
  status: Status;
  activeVault: VaultKind | null;
  /** Active vault's data-encryption-key. Null unless unlocked. */
  dek: CryptoKey | null;
  lastLockReason: string | null;
  settings: Settings;
  hasVaults: boolean;
  unlock: (passphrase: string) => Promise<{ ok: boolean; retryInMs?: number }>;
  provision: (kind: VaultKind, passphrase: string) => Promise<{ ok: boolean; error?: string }>;
  changePassphrase: (kind: VaultKind, oldP: string, newP: string) => Promise<boolean>;
  lock: (reason?: string) => void;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Re-arm the inactivity timer (called on user activity). */
  poke: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [activeVault, setActiveVault] = useState<VaultKind | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [lastLockReason, setLastLockReason] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasVaults, setHasVaults] = useState(false);

  const inactivityTimer = useRef<number | undefined>(undefined);
  const activeVaultRef = useRef<VaultKind | null>(null);
  activeVaultRef.current = activeVault;

  // Bootstrap: load settings and detect whether any vault exists.
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const exists = await anyVaultExists();
      setHasVaults(exists);
      setStatus(exists ? "locked" : "onboarding");
    })();
  }, []);

  const lock = useCallback((reason?: string) => {
    // Drop the key reference. The DEK is a non-extractable CryptoKey; releasing
    // it makes the vault contents unreadable until the passphrase is re-entered.
    setDek(null);
    setActiveVault(null);
    setStatus((prev) => (prev === "onboarding" ? "onboarding" : "locked"));
    if (reason) setLastLockReason(reason);
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
  }, []);

  const unlock = useCallback(async (passphrase: string) => {
    const r = await unlockAttempt(passphrase);
    if (r.ok && r.dek && r.kind) {
      setDek(r.dek);
      setActiveVault(r.kind);
      setStatus("unlocked");
      setLastLockReason(null);
      return { ok: true };
    }
    return { ok: false, retryInMs: r.retryInMs };
  }, []);

  const provision = useCallback(async (kind: VaultKind, passphrase: string) => {
    const r = await provisionVault(kind, passphrase);
    if (r.ok && r.dek) {
      setHasVaults(true);
      setDek(r.dek);
      setActiveVault(kind);
      setStatus("unlocked");
      return { ok: true };
    }
    return { ok: false, error: r.error };
  }, []);

  const changePassphrase = useCallback(
    (kind: VaultKind, oldP: string, newP: string) => updatePassphrase(kind, oldP, newP),
    [],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);
    },
    [settings],
  );

  // Inactivity auto-lock.
  const poke = useCallback(() => {
    if (status !== "unlocked") return;
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(
      () => lock("Locked after inactivity."),
      settings.inactivityLockSeconds * 1000,
    );
  }, [status, settings.inactivityLockSeconds, lock]);

  useEffect(() => {
    if (status === "unlocked") poke();
    return () => {
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    };
  }, [status, poke]);

  // Lock on background / app switch. The private vault is treated as the more
  // sensitive one and always locks when hidden; the finance vault follows its
  // own setting.
  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden") return;
      const v = activeVaultRef.current;
      if (!v) return;
      if (v === "private" && settings.lockPrivateOnBackground) lock("Locked when app moved to background.");
      if (v === "finance" && settings.lockFinanceOnBackground) lock("Locked when app moved to background.");
    }
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [settings.lockPrivateOnBackground, settings.lockFinanceOnBackground, lock]);

  // "Computer connection" — best-effort on the web via WebUSB device attach.
  // A native build would additionally observe USB/MTP state. See SECURITY.md.
  useEffect(() => {
    if (!settings.lockOnComputerConnection) return;
    const usb = (navigator as unknown as { usb?: EventTarget }).usb;
    if (!usb || typeof usb.addEventListener !== "function") return;
    const handler = () => lock("Locked: an external device connection was detected.");
    usb.addEventListener("connect", handler);
    return () => usb.removeEventListener("connect", handler);
  }, [settings.lockOnComputerConnection, lock]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      activeVault,
      dek,
      lastLockReason,
      settings,
      hasVaults,
      unlock,
      provision,
      changePassphrase,
      lock,
      updateSettings,
      poke,
    }),
    [status, activeVault, dek, lastLockReason, settings, hasVaults, unlock, provision, changePassphrase, lock, updateSettings, poke],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}

/** Convenience: throw if used while locked, so pages can assume a live DEK. */
export function useVault(): { dek: CryptoKey; vault: VaultKind } {
  const { dek, activeVault } = useSession();
  if (!dek || !activeVault) throw new Error("vault is locked");
  return { dek, vault: activeVault };
}
