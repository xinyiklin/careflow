import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, LogOut } from "lucide-react";
import { APP_NAME } from "../constants/app";

function getInitials(fullName) {
  if (!fullName) return "U";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AppNavbar({
  fullName,
  onLogout,
  onOpenPatientSearch,
  recentPatients = [],
  onOpenRecentPatient,
}) {
  const initials = getInitials(fullName);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPatientMenuOpen, setIsPatientMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const patientMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }

      if (!patientMenuRef.current?.contains(event.target)) {
        setIsPatientMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="relative h-14">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 select-none">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">
              {APP_NAME}
            </h1>

            <div
              ref={patientMenuRef}
              className="relative flex items-center"
            >
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={onOpenPatientSearch}
                  className="inline-flex h-10 items-center justify-center px-3 text-slate-700 transition hover:bg-slate-50"
                  aria-label="Search patients"
                  title="Search patients"
                >
                  <Search className="h-4 w-4" />
                </button>

                <div className="w-px bg-slate-300" />

                <button
                  type="button"
                  onClick={() => setIsPatientMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 items-center justify-center px-3 text-slate-700 transition hover:bg-slate-50"
                  aria-label="Open recent patients"
                  title="Recent patients"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {isPatientMenuOpen && (
                <div className="absolute left-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      Recent Patients
                    </p>
                  </div>

                  {recentPatients.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
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
                            className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
                          >
                            <div className="text-sm font-medium text-slate-900">
                              {patient.display_name || patient.full_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              DOB: {patient.date_of_birth || "—"}
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

          <div ref={userMenuRef} className="relative flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {fullName || "User"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              aria-label="Open user menu"
            >
              {initials}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}