import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Pill,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CareFlowIcon } from "@careflow/ui-icons";

import { useAuth } from "../features/auth/AuthProvider";
import { useMessageThreads } from "../features/messages/api/messaging";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { ThemeToggle } from "../shared/theme";
import { Select, cn } from "../shared/ui";

type NavItem = {
  to: string;
  labelKey: string;
  Icon: LucideIcon;
  end?: boolean;
  showUnread?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", Icon: Home, end: true },
  { to: "/appointments", labelKey: "nav.appointments", Icon: Calendar },
  { to: "/records", labelKey: "nav.records", Icon: FileText },
  { to: "/medications", labelKey: "nav.medications", Icon: Pill },
  {
    to: "/messages",
    labelKey: "nav.messages",
    Icon: MessageSquare,
    showUnread: true,
  },
];

function displayName(args: {
  preferred_name: string | null;
  first_name: string;
  last_name: string;
}) {
  if (args.preferred_name && args.preferred_name.trim()) {
    return args.preferred_name;
  }
  return `${args.first_name} ${args.last_name}`.trim();
}

function initials(args: { first_name: string; last_name: string }) {
  const a = args.first_name?.[0] ?? "";
  const b = args.last_name?.[0] ?? "";
  return (a + b).toUpperCase() || "PT";
}

type AvatarMenuProps = {
  name: string;
  initials: string;
  onSignOut: () => void;
};

function AvatarMenu({ name, initials, onSignOut }: AvatarMenuProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const currentLang = i18n.resolvedLanguage ?? i18n.language;

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    void i18n.changeLanguage(event.target.value);
  };

  const handleProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  const handleSignOut = () => {
    setOpen(false);
    onSignOut();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name || t("nav.profile")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full p-0.5 pr-1.5",
          "text-text-muted transition-colors hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initials}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("nav.profile")}
          className={cn(
            "absolute right-0 z-40 mt-2 w-72 origin-top-right rounded-lg border border-border bg-surface-elevated",
            "shadow-[var(--shadow-md)]"
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
              {t("auth.portalLabel")}
            </div>
            <div className="truncate text-sm font-semibold text-text">
              {name || t("nav.profile")}
            </div>
          </div>

          <div className="px-2 py-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleProfile}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-text-muted",
                "hover:bg-surface-soft hover:text-text",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              )}
            >
              <User size={16} aria-hidden="true" />
              <span>{t("nav.profile")}</span>
            </button>
          </div>

          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 text-xs font-medium text-text-muted">
              {t("common.theme")}
            </div>
            <ThemeToggle size="full" className="w-full justify-between" />
          </div>

          <div className="border-t border-border px-4 py-3">
            <label
              htmlFor="patient-language-menu"
              className="mb-2 block text-xs font-medium text-text-muted"
            >
              {t("common.language")}
            </label>
            <Select
              id="patient-language-menu"
              value={currentLang}
              onChange={handleLanguageChange}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="border-t border-border px-2 py-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-text-muted",
                "hover:bg-surface-soft hover:text-text",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              )}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{t("common.signOut")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { logout, patient } = useAuth();
  const { data: threads } = useMessageThreads();
  const hasUnreadMessages =
    threads?.some((thread) => thread.unread_for_patient) ?? false;

  const name = patient
    ? displayName({
        preferred_name: patient.preferred_name,
        first_name: patient.first_name,
        last_name: patient.last_name,
      })
    : "";
  const userInitials = patient
    ? initials({
        first_name: patient.first_name,
        last_name: patient.last_name,
      })
    : "PT";

  const mobileNav = useMemo(() => NAV_ITEMS, []);

  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      {/* Top nav */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur",
          "px-4 py-3 md:px-6"
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-2 rounded-md py-1 pr-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            )}
            aria-label="CareFlow"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
              <CareFlowIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-text">
              CareFlow
            </span>
          </NavLink>

          {/* Desktop primary nav */}
          <nav
            aria-label="Primary"
            className="ml-2 hidden flex-1 items-center gap-1 md:flex"
          >
            {NAV_ITEMS.map(({ to, labelKey, Icon, end, showUnread }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-text-muted hover:bg-surface-soft hover:text-text"
                  )
                }
              >
                <span className="relative inline-flex">
                  <Icon size={16} aria-hidden="true" />
                  {showUnread && hasUnreadMessages ? (
                    <span
                      aria-label={t("nav.unreadMessages")}
                      className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
                    />
                  ) : null}
                </span>
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Spacer on mobile pushes avatar to the right */}
          <div className="flex-1 md:hidden" />

          <AvatarMenu name={name} initials={userInitials} onSignOut={logout} />
        </div>
      </header>

      {/* Main content — keyed on the path so the fade re-fires on each
          navigation. The animation lives in `index.css` (`.cf-page-fade-in`)
          and is disabled under `prefers-reduced-motion`. */}
      <main className="min-h-[calc(100dvh-64px)]">
        <div
          key={location.pathname}
          className={cn(
            "cf-page-fade-in",
            "mx-auto w-full max-w-5xl",
            "px-4 py-6 sm:px-6 md:px-8 md:py-8",
            "pb-24 md:pb-10"
          )}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center justify-around",
          "border-t border-border bg-surface/95 backdrop-blur",
          "pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1",
          "md:hidden"
        )}
      >
        {mobileNav.map(({ to, labelKey, Icon, end, showUnread }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                isActive ? "text-accent" : "text-text-muted hover:text-text"
              )
            }
          >
            <span className="relative inline-flex">
              <Icon size={20} aria-hidden="true" />
              {showUnread && hasUnreadMessages ? (
                <span
                  aria-label={t("nav.unreadMessages")}
                  className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
                />
              ) : null}
            </span>
            <span className="truncate">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
