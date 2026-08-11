import { useLocation, useNavigate } from "react-router-dom";
import type { VaultKind } from "../crypto/vault";
import {
  IconChart,
  IconGear,
  IconHome,
  IconList,
  IconTarget,
  IconUsers,
} from "../ui/icons";
import type { ComponentType, SVGProps } from "react";

interface Tab {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const FINANCE_TABS: Tab[] = [
  { to: "/finance", label: "Home", Icon: IconHome },
  { to: "/finance/transactions", label: "Activity", Icon: IconList },
  { to: "/finance/budgets", label: "Budgets", Icon: IconTarget },
  { to: "/finance/reports", label: "Reports", Icon: IconChart },
  { to: "/settings", label: "Settings", Icon: IconGear },
];

const PEOPLE_TABS: Tab[] = [
  { to: "/people", label: "Overview", Icon: IconHome },
  { to: "/people/list", label: "People", Icon: IconUsers },
  { to: "/people/records", label: "Records", Icon: IconList },
  { to: "/settings", label: "Settings", Icon: IconGear },
];

export function TabBar({ vault }: { vault: VaultKind }) {
  const nav = useNavigate();
  const loc = useLocation();
  const tabs = vault === "finance" ? FINANCE_TABS : PEOPLE_TABS;

  function isActive(to: string): boolean {
    if (to === "/finance" || to === "/people") return loc.pathname === to;
    return loc.pathname.startsWith(to);
  }

  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {tabs.map((t) => (
          <button
            key={t.to}
            className={`tab ${isActive(t.to) ? "on" : ""}`}
            onClick={() => nav(t.to)}
          >
            <t.Icon />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
