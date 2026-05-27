import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Home,
  LogOut,
  Pill,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "../features/auth/AuthProvider";

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/appointments", label: "Appointments", Icon: Calendar },
  { to: "/medications", label: "Medications", Icon: Pill },
  { to: "/allergies", label: "Allergies", Icon: AlertTriangle },
  { to: "/profile", label: "Profile", Icon: User },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-cf-control px-2.5 py-1.5 text-xs font-medium transition-colors";
  return isActive
    ? `${base} bg-cf-accent-soft text-cf-text`
    : `${base} text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text`;
}

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-cf-page-bg">
      <header className="border-b border-cf-border bg-cf-surface">
        <div className="mx-auto max-w-3xl px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight text-cf-text">
              CareFlow Portal
            </span>
          </div>
          <nav
            aria-label="Primary"
            className="-mx-1 mt-2 flex flex-wrap items-center gap-1 pb-2"
          >
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => logout()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-cf-control px-2.5 py-1.5 text-xs font-medium text-cf-text-muted transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl">{children}</main>
    </div>
  );
}
