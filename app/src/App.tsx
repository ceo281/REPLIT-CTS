import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "./session/SessionContext";
import { useHidden } from "./ui/hooks";
import { Onboarding } from "./pages/Onboarding";
import { LockScreen } from "./pages/LockScreen";
import { TabBar } from "./pages/TabBar";
import { FinanceDashboard } from "./finance/pages/Dashboard";
import { TransactionsPage } from "./finance/pages/Transactions";
import { BudgetsPage } from "./finance/pages/Budgets";
import { ReportsPage } from "./finance/pages/Reports";
import { PeopleDashboard } from "./people/pages/Dashboard";
import { PeopleListPage } from "./people/pages/PeopleList";
import { PersonDetailPage } from "./people/pages/PersonDetail";
import { RecordsExplorer } from "./people/pages/RecordsExplorer";
import { SettingsPage } from "./pages/Settings";

export function App() {
  const { status, activeVault, settings, poke } = useSession();
  const hidden = useHidden();

  // Apply theme + per-vault accent to the document root.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light") root.setAttribute("data-theme", "light");
    else if (settings.theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    if (activeVault) root.setAttribute("data-vault", activeVault);
    else root.removeAttribute("data-vault");
  }, [settings.theme, activeVault]);

  // Any interaction re-arms the inactivity timer.
  useEffect(() => {
    if (status !== "unlocked") return;
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, poke));
  }, [status, poke]);

  if (status === "loading") {
    return <div className="app-shell" style={{ display: "grid", placeItems: "center" }}>
      <div className="muted">Loading…</div>
    </div>;
  }
  if (status === "onboarding") return <Onboarding />;
  if (status === "locked") return <LockScreen />;

  // Unlocked. When the app is backgrounded, cover the content so the OS task
  // switcher snapshot cannot reveal private data (defense in depth alongside
  // the auto-lock that will typically already have fired).
  return (
    <div className="app-shell">
      {hidden && (
        <div className="privacy-shield">
          <span>Ledger</span>
        </div>
      )}
      {activeVault === "finance" ? <FinanceRoutes /> : <PeopleRoutes />}
      <TabBar vault={activeVault!} />
    </div>
  );
}

function FinanceRoutes() {
  return (
    <Routes>
      <Route path="/finance" element={<FinanceDashboard />} />
      <Route path="/finance/transactions" element={<TransactionsPage />} />
      <Route path="/finance/budgets" element={<BudgetsPage />} />
      <Route path="/finance/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/finance" replace />} />
    </Routes>
  );
}

function PeopleRoutes() {
  return (
    <Routes>
      <Route path="/people" element={<PeopleDashboard />} />
      <Route path="/people/list" element={<PeopleListPage />} />
      <Route path="/people/person/:id" element={<PersonDetailPage />} />
      <Route path="/people/records" element={<RecordsExplorer />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/people" replace />} />
    </Routes>
  );
}

/** Redirect to the vault home when the active vault changes (e.g. after unlock). */
export function useVaultHomeRedirect() {
  const { activeVault } = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!activeVault) return;
    const home = activeVault === "finance" ? "/finance" : "/people";
    if (!loc.pathname.startsWith(home) && loc.pathname !== "/settings") nav(home, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVault]);
}
