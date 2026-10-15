import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  LogOut,
  FileText,
  Keyboard,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";

import useFacility from "../../features/facilities/hooks/useFacility";
import { formatDOB } from "../../shared/utils/dateTime";
import { getPatientName } from "../../features/patients/utils/patientDisplay";
import { Badge, Button, Input } from "../../shared/components/ui";
import { NAVBAR_HEIGHT, PAGE_GUTTER_X } from "../../shared/constants/layout";

import type { EntityId } from "../../shared/api/types";
import type {
  ApiRecord,
  PatientLike,
  UserProfile,
} from "../../shared/types/domain";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

type AppNavbarProps = {
  onLogout?: () => void;
  user: UserProfile | null;
  onOpenQuickActions?: () => void;
  onOpenNotes?: () => void;
  onOpenPreferences?: () => void;
  onOpenPatientSearch?: () => void;
  recentPatients?: PatientLike[];
  onOpenRecentPatient?: (patient: PatientLike) => void;
  patientSearchShortcut?: string | null;
};

const MENU_ROW_CLASS =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/25";
const MENU_SECTION_LABEL_CLASS =
  "px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle";
const POPOVER_CLASS =
  "cf-popover-in absolute top-[2.75rem] z-50 overflow-hidden rounded-[var(--radius-cf-card)] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]";

function getUserInitials(user: UserProfile | null) {
  const initials = [user?.first_name, user?.last_name]
    .map((value) => (value || "").trim().charAt(0))
    .filter(Boolean)
    .join("");

  if (initials) return initials.slice(0, 2).toUpperCase();
  return (user?.username || "CF").slice(0, 2).toUpperCase();
}

function getPatientInitials(patient: PatientLike) {
  const initials = [patient.first_name, patient.last_name]
    .map((value) => (value || "").trim().charAt(0))
    .filter(Boolean)
    .join("");
  return initials.slice(0, 2).toUpperCase() || "PT";
}

function getUserDisplayName(user: UserProfile | null) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user?.username || "CareFlow User";
}

function getRoleName(role: ApiRecord | string | null | undefined) {
  if (!role || typeof role === "string") return "";
  return typeof role.name === "string" ? role.name : "";
}

function getQuickActionsShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl/Cmd K";

  const platform =
    (navigator as NavigatorWithUserAgentData).userAgentData?.platform ||
    navigator.platform ||
    "";
  return /mac|iphone|ipad|ipod/i.test(platform) ? "Cmd K" : "Ctrl K";
}

export default function AppNavbar({
  onLogout,
  user,
  onOpenQuickActions,
  onOpenNotes,
  onOpenPreferences,
  onOpenPatientSearch,
  recentPatients = [],
  onOpenRecentPatient,
  patientSearchShortcut = null,
}: AppNavbarProps) {
  const {
    memberships,
    selectedFacilityId,
    setSelectedFacilityId,
    facility,
    role,
  } = useFacility();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPatientMenuOpen, setIsPatientMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const patientMenuRef = useRef<HTMLDivElement | null>(null);
  const initials = useMemo(() => getUserInitials(user), [user]);
  const userDisplayName = useMemo(() => getUserDisplayName(user), [user]);
  const quickActionsShortcut = useMemo(getQuickActionsShortcutLabel, []);
  const roleName = getRoleName(role);
  const facilitySelectId = useId();
  const recentMenuId = useId();
  const userMenuId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!userMenuRef.current?.contains(target)) setIsUserMenuOpen(false);
      if (!patientMenuRef.current?.contains(target))
        setIsPatientMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsUserMenuOpen(false);
      setIsPatientMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-transparent py-1.5 ${PAGE_GUTTER_X}`}
    >
      <div
        className="flex w-full max-w-none items-center justify-between gap-3 bg-transparent"
        style={{ height: NAVBAR_HEIGHT }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div ref={patientMenuRef} className="relative flex items-center">
            <div className="inline-flex h-9 max-w-full items-center rounded-xl border border-cf-border bg-cf-surface p-0.5 shadow-[var(--shadow-panel)] transition-colors hover:border-cf-border-strong focus-within:border-cf-accent focus-within:ring-2 focus-within:ring-cf-accent/10">
              <button
                type="button"
                onClick={onOpenPatientSearch}
                className="group inline-flex h-7 min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 text-xs font-medium leading-none text-cf-text-muted transition-colors hover:bg-cf-surface-soft hover:text-cf-text focus:outline-none sm:px-3"
                aria-label="Search Patient"
                title="Search Patient"
              >
                <Search className="h-3.5 w-3.5 text-cf-text-subtle transition-colors group-hover:text-cf-text" />
                <span className="hidden sm:inline">Search Patient</span>
                {patientSearchShortcut ? (
                  <kbd className="hidden rounded-md border border-cf-border bg-cf-surface-soft px-1.5 py-0.5 text-[10px] font-medium leading-none text-cf-text-subtle lg:inline">
                    {patientSearchShortcut}
                  </kbd>
                ) : null}
              </button>

              <div className="h-4 w-px bg-cf-border" />

              <button
                type="button"
                onClick={() => setIsPatientMenuOpen((prev) => !prev)}
                className="group inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium leading-none text-cf-text-muted transition-colors hover:bg-cf-surface-soft hover:text-cf-text focus:outline-none sm:px-3"
                aria-label="Recent patients"
                aria-expanded={isPatientMenuOpen}
                aria-controls={isPatientMenuOpen ? recentMenuId : undefined}
                title="Recent patients"
              >
                <span className="hidden sm:inline">Recent</span>
                <ChevronDown
                  className={[
                    "h-3.5 w-3.5 text-cf-text-subtle transition-transform duration-150 group-hover:text-cf-text",
                    isPatientMenuOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {isPatientMenuOpen && (
              <div
                id={recentMenuId}
                className={`${POPOVER_CLASS} left-0 w-[24rem] max-w-[calc(100vw-1rem)]`}
              >
                <div className="border-b border-cf-border bg-cf-surface-muted px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                  Recent Patients
                </div>

                {recentPatients.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-cf-text-muted">
                    No recent patients
                  </p>
                ) : (
                  <ul className="max-h-80 divide-y divide-cf-border/60 overflow-y-auto">
                    {recentPatients.map((patient) => {
                      const patientInitials = getPatientInitials(patient);
                      return (
                        <li key={patient.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPatientMenuOpen(false);
                              onOpenRecentPatient?.(patient);
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cf-surface-soft focus:bg-cf-surface-soft focus:outline-none"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cf-surface-soft text-[11px] font-semibold text-cf-text-muted">
                              {patientInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-cf-text">
                                {getPatientName(patient)}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-cf-text-subtle">
                                <span>
                                  DOB:{" "}
                                  {patient.date_of_birth
                                    ? formatDOB(patient.date_of_birth)
                                    : "—"}
                                </span>
                                {patient.chart_number ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono text-[11px] text-cf-text-muted">
                                      MRN {patient.chart_number}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-cf-text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          ref={userMenuRef}
          className="relative flex shrink-0 items-center gap-1.5"
        >
          <Button
            type="button"
            size="sm"
            shape="rounded"
            onClick={onOpenQuickActions}
            className="hidden h-9 lg:inline-flex"
          >
            <Keyboard className="h-4 w-4" />
            Actions
            <kbd className="rounded-md border border-cf-border bg-cf-surface-soft px-1.5 py-0.5 text-[11px] font-medium text-cf-text-subtle">
              {quickActionsShortcut}
            </kbd>
          </Button>

          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-xs font-semibold leading-none tracking-[0.06em] text-cf-text shadow-[var(--shadow-panel)] transition-colors duration-150 hover:border-cf-border-strong hover:bg-cf-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25"
            aria-label="Open user menu"
            aria-expanded={isUserMenuOpen}
            aria-controls={isUserMenuOpen ? userMenuId : undefined}
          >
            {initials}
          </button>

          {isUserMenuOpen && (
            <div
              id={userMenuId}
              className={`${POPOVER_CLASS} right-0 w-[20rem] max-w-[calc(100vw-1rem)]`}
            >
              <div className="flex items-start gap-3 border-b border-cf-border bg-cf-surface-muted px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-sm font-semibold tracking-[0.06em] text-cf-text">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-cf-text">
                    {userDisplayName}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-cf-text-subtle">
                    {user?.username || "User"}
                  </div>
                  {user?.email ? (
                    <div className="truncate text-xs text-cf-text-subtle">
                      {user.email}
                    </div>
                  ) : null}
                  {roleName || facility?.name ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {roleName ? (
                        <Badge
                          variant="outline"
                          className="px-2 py-0.5 text-[11px]"
                        >
                          {roleName}
                        </Badge>
                      ) : null}
                      {facility?.name ? (
                        <Badge
                          variant="muted"
                          className="px-2 py-0.5 text-[11px]"
                        >
                          {facility.name}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {memberships.length > 1 ? (
                <div className="border-b border-cf-border p-2 pt-3">
                  <label
                    htmlFor={facilitySelectId}
                    className={`${MENU_SECTION_LABEL_CLASS} block`}
                  >
                    Facility
                  </label>
                  <div className="px-1">
                    <Input
                      id={facilitySelectId}
                      as="select"
                      value={selectedFacilityId ?? ""}
                      onChange={(event) =>
                        setSelectedFacilityId(
                          (event.target.value || null) as EntityId | null
                        )
                      }
                      className="cursor-pointer pr-8"
                    >
                      {memberships.map((membership) => (
                        <option
                          key={membership.facility.id}
                          value={String(membership.facility.id)}
                        >
                          {membership.facility.name}
                        </option>
                      ))}
                    </Input>
                  </div>
                </div>
              ) : null}

              <div className="border-b border-cf-border p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenPreferences?.();
                  }}
                  className={`${MENU_ROW_CLASS} text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text`}
                >
                  <SlidersHorizontal className="h-4 w-4 text-cf-text-subtle" />
                  Customize Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenNotes?.();
                  }}
                  className={`${MENU_ROW_CLASS} text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text`}
                >
                  <FileText className="h-4 w-4 text-cf-text-subtle" />
                  Open Notes
                </button>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className={`${MENU_ROW_CLASS} text-cf-danger-text hover:bg-cf-danger-bg`}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
