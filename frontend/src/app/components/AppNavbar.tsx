import { useEffect, useMemo, useRef, useState } from "react";
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
import { NAVBAR_HEIGHT } from "../../shared/constants/layout";

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
};

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
    <header className="sticky top-0 z-40 bg-transparent px-4 py-1.5 sm:px-5 lg:px-6 xl:px-7 transition-colors duration-150">
      <div
        className="flex w-full max-w-none items-center justify-between gap-3 bg-transparent"
        style={{ height: NAVBAR_HEIGHT }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div ref={patientMenuRef} className="relative flex items-center">
            <div className="inline-flex h-9 max-w-full items-center rounded-xl border border-cf-border bg-cf-surface-muted p-0.5 shadow-[var(--shadow-panel)] transition-all hover:border-cf-border-strong focus-within:border-cf-accent focus-within:ring-2 focus-within:ring-cf-accent/10">
              <button
                type="button"
                onClick={onOpenPatientSearch}
                className="group inline-flex h-7 min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-semibold leading-none text-cf-text-muted transition hover:bg-cf-surface hover:text-cf-text sm:px-3 focus:outline-none"
                aria-label="Search Patient"
                title="Search Patient"
              >
                <Search className="h-3.5 w-3.5 text-cf-text-subtle transition-colors group-hover:text-cf-text" />
                <span className="hidden sm:inline text-xs font-semibold">
                  Search Patient
                </span>
                <span className="hidden rounded-md bg-cf-surface-soft px-1.5 py-0.5 text-[10px] font-bold text-cf-text-subtle lg:inline border border-cf-border/40">
                  /
                </span>
              </button>

              <div className="h-4 w-px bg-cf-border-strong/50" />

              <button
                type="button"
                onClick={() => setIsPatientMenuOpen((prev) => !prev)}
                className="group inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold leading-none text-cf-text-muted transition hover:bg-cf-surface hover:text-cf-text sm:px-3 focus:outline-none"
                aria-label="Open recent patients"
                title="Recent patients"
              >
                <span className="hidden sm:inline text-xs font-semibold">
                  Recent
                </span>
                <ChevronDown
                  className={[
                    "h-3.5 w-3.5 transition-transform duration-200 text-cf-text-subtle group-hover:text-cf-text",
                    isPatientMenuOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {isPatientMenuOpen && (
              <div className="absolute left-0 top-[2.75rem] z-50 w-[24rem] overflow-hidden rounded-2xl border border-cf-border bg-cf-surface/95 shadow-[var(--shadow-panel-lg)] backdrop-blur-md transition-all duration-200 ease-out origin-top-left">
                <div className="flex items-center justify-between border-b border-cf-border px-4 py-3 bg-cf-surface-muted/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    Recent Patients
                  </span>
                  <span className="text-[10px] font-semibold text-cf-text-subtle/80 bg-cf-surface px-2 py-0.5 rounded-md border border-cf-border">
                    Last {recentPatients.length} visited
                  </span>
                </div>

                {recentPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center bg-cf-surface/50">
                    <Search className="h-8 w-8 text-cf-text-subtle/50 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-medium text-cf-text-muted">
                      No recent patients yet
                    </p>
                    <p className="text-xs text-cf-text-subtle mt-0.5">
                      Patients you search or view will appear here
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-cf-border/40 py-1">
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
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cf-surface-soft/80 focus:bg-cf-surface-soft/80 focus:outline-none"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cf-border bg-cf-surface-soft text-[11px] font-bold text-cf-text-muted transition-all group-hover:border-cf-border-strong group-hover:bg-cf-surface shadow-sm">
                              {patientInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-cf-text transition-colors group-hover:text-cf-accent">
                                {getPatientName(patient)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-cf-text-subtle">
                                <span>
                                  DOB:{" "}
                                  {patient.date_of_birth
                                    ? formatDOB(patient.date_of_birth)
                                    : "—"}
                                </span>
                                {patient.chart_number ? (
                                  <>
                                    <span className="text-cf-border-strong">
                                      •
                                    </span>
                                    <span className="font-mono text-[11px] text-cf-text-muted bg-cf-surface-soft/60 px-1 py-0.2 rounded border border-cf-border/50">
                                      MRN: {patient.chart_number}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-cf-text-subtle/30 opacity-0 transition-all -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
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
            className="hidden h-9 leading-none lg:inline-flex hover:scale-[1.02] active:scale-[0.98] transition-transform duration-100"
          >
            <Keyboard className="h-4 w-4" />
            Actions
            <span className="rounded-md bg-cf-surface-soft px-1.5 py-0.5 text-[11px] font-semibold text-cf-text-subtle border border-cf-border/40">
              {quickActionsShortcut}
            </span>
          </Button>

          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-xs font-bold leading-none tracking-[0.08em] text-cf-text shadow-[var(--shadow-panel)] transition-all duration-150 hover:border-cf-border-strong hover:bg-cf-surface-soft focus:outline-none focus:ring-2 focus:ring-cf-accent/15 focus:ring-offset-1"
            aria-label="Open user menu"
          >
            {initials}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-[2.75rem] z-50 w-[22rem] overflow-hidden rounded-2xl border border-cf-border bg-cf-surface/95 shadow-[var(--shadow-panel-lg)] backdrop-blur-md transition-all duration-200 ease-out origin-top-right">
              <div className="border-b border-cf-border bg-cf-surface-muted/50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-sm font-semibold tracking-[0.08em] text-cf-text shadow-sm">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-cf-text truncate">
                      {userDisplayName}
                    </div>
                    <div className="mt-0.5 text-xs text-cf-text-subtle font-mono truncate">
                      {user?.username || "User"}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {roleName ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold px-2 py-0.5"
                        >
                          {roleName}
                        </Badge>
                      ) : null}
                      {facility?.name ? (
                        <Badge
                          variant="muted"
                          className="text-[11px] font-semibold px-2 py-0.5"
                        >
                          {facility.name}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {user?.email ? (
                  <div className="mt-3 text-xs text-cf-text-subtle truncate bg-cf-surface-soft/40 px-2.5 py-1.5 rounded-lg border border-cf-border/50">
                    {user.email}
                  </div>
                ) : null}
              </div>

              {memberships.length > 1 ? (
                <div className="border-b border-cf-border px-4 py-4 bg-cf-surface/50">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                    Switch Facility
                  </div>
                  <div className="mt-2.5 relative">
                    <Input
                      as="select"
                      value={selectedFacilityId ?? ""}
                      onChange={(event) =>
                        setSelectedFacilityId(
                          (event.target.value || null) as EntityId | null
                        )
                      }
                      className="bg-cf-surface cursor-pointer pr-8"
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

              <div className="border-b border-cf-border px-4 py-4 bg-cf-surface/50">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                  Personalize
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenPreferences?.();
                  }}
                  className="group mt-2.5 flex w-full items-center justify-between rounded-xl border border-cf-border bg-cf-surface px-3.5 py-2.5 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text focus:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4 w-4 text-cf-text-subtle transition-colors group-hover:text-cf-accent" />
                    <span>Customize Workspace</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-cf-text-subtle/40 transition-transform group-hover:translate-x-0.5 group-hover:text-cf-text-subtle" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenNotes?.();
                  }}
                  className="group mt-2 flex w-full items-center justify-between rounded-xl border border-cf-border bg-cf-surface px-3.5 py-2.5 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text focus:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-cf-text-subtle transition-colors group-hover:text-cf-accent" />
                    <span>Open Notes</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-cf-text-subtle/40 transition-transform group-hover:translate-x-0.5 group-hover:text-cf-text-subtle" />
                </button>
              </div>

              <div className="bg-cf-surface-muted/30 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-cf-danger-text hover:bg-cf-danger-bg transition focus:outline-none"
                >
                  <LogOut className="h-4 w-4 stroke-[2]" />
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
