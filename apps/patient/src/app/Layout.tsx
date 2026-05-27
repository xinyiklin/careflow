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
    "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-[1px]";
  return isActive
    ? `${base} border-cf-accent text-cf-text`
    : `${base} border-transparent text-cf-text-muted hover:text-cf-text hover:border-cf-border-strong`;
}

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-cf-page-bg">
      <header className="border-b border-cf-border bg-cf-surface">
        <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cf-accent" />
              <span className="text-sm font-semibold tracking-tight text-cf-text">
                CareFlow Patient Portal
              </span>
            </div>
          </div>
          <nav
            aria-label="Primary"
            className="mt-3 flex items-center justify-between"
          >
            <div className="flex gap-2">
              {NAV_ITEMS.map(({ to, label, Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={navLinkClass}>
                  <Icon size={14} className="shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="mb-2 inline-flex items-center gap-1.5 rounded-cf-control border border-cf-border bg-cf-surface px-2.5 py-1.5 text-xs font-semibold text-cf-text-muted transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
            >
              <LogOut size={13} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl">{children}</main>
    </div>
  );
}
