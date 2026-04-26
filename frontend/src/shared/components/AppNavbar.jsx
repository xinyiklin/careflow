import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  LogOut,
  Command,
  FileText,
  SlidersHorizontal,
} from "lucide-react";

import useFacility from "../../features/facilities/hooks/useFacility";
import { formatDOB } from "../utils/dateTime";
import { Badge, Button, Input } from "./ui";
import { NAVBAR_HEIGHT } from "../constants/layout";

function getUserInitials(user) {
  const initials = [user?.first_name, user?.last_name]
    .map((value) => (value || "").trim().charAt(0))
    .filter(Boolean)
    .join("");

  if (initials) return initials.slice(0, 2).toUpperCase();
  return (user?.username || "CF").slice(0, 2).toUpperCase();
}

function getUserDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user?.username || "CareFlow User";
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
}) {
  const {
    memberships,
    selectedFacilityId,
    setSelectedFacilityId,
    facility,
    role,
  } = useFacility();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPatientMenuOpen, setIsPatientMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const patientMenuRef = useRef(null);
  const initials = useMemo(() => getUserInitials(user), [user]);
  const userDisplayName = useMemo(() => getUserDisplayName(user), [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!userMenuRef.current?.contains(event.target))
        setIsUserMenuOpen(false);
      if (!patientMenuRef.current?.contains(event.target))
        setIsPatientMenuOpen(false);
    };
    const handleEscape = (event) => {
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
    <header className="sticky top-0 z-40 bg-cf-page-bg/85 px-4 py-1.5 backdrop-blur-xl sm:px-5 lg:px-6 xl:px-7">
      <div
        className="flex w-full max-w-none items-center justify-between gap-3 bg-transparent"
        style={{ height: NAVBAR_HEIGHT }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div ref={patientMenuRef} className="relative flex items-center">
            <div className="inline-flex h-9 max-w-full items-center gap-1 rounded-full border border-cf-border bg-cf-surface px-1 shadow-[var(--shadow-panel)]">
              <button
                type="button"
                onClick={onOpenPatientSearch}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-semibold leading-none text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text sm:px-3"
                aria-label="Search patients"
                title="Search patients"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search Patients</span>
                <span className="hidden rounded-md bg-cf-surface px-1.5 py-0.5 text-[11px] font-semibold text-cf-text-subtle lg:inline">
                  /
                </span>
              </button>

              <div className="h-5 w-px bg-cf-border" />

              <button
                type="button"
                onClick={() => setIsPatientMenuOpen((prev) => !prev)}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-semibold leading-none text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text sm:px-3"
                aria-label="Open recent patients"
                title="Recent patients"
              >
                <span className="hidden sm:inline">Recent</span>
                <ChevronDown
                  className={[
                    "h-4 w-4 transition-transform duration-200",
                    isPatientMenuOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {isPatientMenuOpen && (
              <div className="absolute left-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-xl">
                <div className="border-b border-cf-border px-4 py-3">
                  <p className="text-sm font-semibold text-cf-text">
                    Recent Patients
                  </p>
                </div>

                {recentPatients.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-cf-text-muted">
                    No recent patients yet.
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {recentPatients.map((patient) => (
                      <li key={patient.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPatientMenuOpen(false);
                            onOpenRecentPatient?.(patient);
                          }}
                          className="block w-full px-4 py-3 text-left transition hover:bg-cf-surface-soft"
                        >
                          <div className="text-sm font-medium text-cf-text">
                            {`${patient.last_name}, ${patient.first_name}`}
                          </div>
                          <div className="text-xs text-cf-text-subtle">
                            DOB:{" "}
                            {patient.date_of_birth
                              ? formatDOB(patient.date_of_birth)
                              : "—"}
                            {patient.chart_number
                              ? ` • MRN: ${patient.chart_number}`
                              : ""}
                          </div>
                        </button>
                      </li>
                    ))}
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
            shape="pill"
            onClick={onOpenQuickActions}
            className="hidden h-9 leading-none lg:inline-flex"
          >
            <Command className="h-4 w-4" />
            Actions
            <span className="rounded-md bg-cf-surface-soft px-1.5 py-0.5 text-[11px] font-semibold text-cf-text-subtle">
              ⌘K
            </span>
          </Button>

          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cf-border bg-cf-surface text-xs font-semibold leading-none tracking-[0.14em] text-cf-text shadow-[var(--shadow-panel)] transition hover:border-cf-border-strong hover:bg-cf-surface-soft"
            aria-label="Open user menu"
          >
            {initials}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-xl">
              <div className="border-b border-cf-border px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface-soft text-sm font-semibold tracking-[0.14em] text-cf-text">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-cf-text">
                      {userDisplayName}
                    </div>
                    <div className="mt-0.5 text-xs text-cf-text-subtle">
                      {user?.username || "User"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {role?.name ? (
                        <Badge variant="outline">{role.name}</Badge>
                      ) : null}
                      {facility?.name ? (
                        <Badge variant="muted">{facility.name}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {user?.email ? (
                  <div className="mt-3 text-xs text-cf-text-subtle">
                    {user.email}
                  </div>
                ) : null}
              </div>

              {memberships.length > 1 ? (
                <div className="border-b border-cf-border px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                    Switch Facility
                  </div>
                  <div className="mt-3">
                    <Input
                      as="select"
                      value={selectedFacilityId ?? ""}
                      onChange={(event) =>
                        setSelectedFacilityId(event.target.value || null)
                      }
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

              <div className="border-b border-cf-border px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                  Personalize
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenPreferences?.();
                  }}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl border border-cf-border bg-cf-surface px-3 py-3 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Customize Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenNotes?.();
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-cf-border bg-cf-surface px-3 py-3 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
                >
                  <FileText className="h-4 w-4" />
                  Open Notes
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout?.();
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
