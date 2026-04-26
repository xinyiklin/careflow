import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import { searchPatients } from "../api/patients";
import { parsePatientQuery } from "../utils/parsePatientQuery";
import {
  PatientAvatar,
  PatientDobMrnLine,
  PatientNameLine,
} from "./PatientIdentity";
import { Button, Input, Notice } from "../../../shared/components/ui";
import { getErrorMessage } from "../../../shared/utils/errors";

export default function PatientSearchField({
  facilityId,
  selectedPatient,
  onSelectPatient,
  onOpenDetailedSearch,
  onOpenCreatePatient,
  recentPatients = [],
  showDetailedSearch = true,
  showNoResultActions = true,
  compactSelected = false,
  showSelectedAvatar = true,
  resultsDropdownClassName = "",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showRecentPatients, setShowRecentPatients] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  const cleanQuery = useMemo(
    () => (query || "").trim().replace(/\s+/g, " "),
    [query]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setShowResults(false);
        setShowRecentPatients(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (cleanQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const parsed = parsePatientQuery(cleanQuery);
        const searchPayload =
          parsed.name ||
          parsed.date_of_birth ||
          parsed.chart_number ||
          parsed.phone
            ? {
                facilityId,
                name: parsed.name,
                date_of_birth: parsed.date_of_birth,
                chart_number: parsed.chart_number,
                phone: parsed.phone,
              }
            : { facilityId, search: cleanQuery };
        const data = await searchPatients(searchPayload);
        setResults(data);
        setShowResults(true);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to search patients."));
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cleanQuery, facilityId]);

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setQuery("");
    setResults([]);
    setShowResults(false);
    setShowRecentPatients(false);
  };

  const clearSelectedPatient = () => onSelectPatient(null);

  return (
    <div className="space-y-2" ref={containerRef}>
      {selectedPatient ? (
        <div
          className={[
            "flex items-center justify-between gap-3 rounded-2xl border border-cf-border bg-cf-surface-soft px-3",
            compactSelected ? "h-[42px] py-0" : "py-3",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-3">
            {showSelectedAvatar ? (
              <PatientAvatar
                patient={selectedPatient}
                size={compactSelected ? "sm" : "md"}
              />
            ) : null}
            <div className="min-w-0">
              <PatientNameLine patient={selectedPatient} className="text-sm" />
              {!compactSelected ? (
                <PatientDobMrnLine
                  patient={selectedPatient}
                  className="mt-0.5"
                />
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedPatient}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface hover:text-cf-text"
            aria-label="Clear selected patient"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-cf-text-subtle" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setShowResults(true);
                }}
                className={compactSelected ? "h-[42px] pl-10" : "pl-10"}
              />

              {showResults && (
                <div
                  className={[
                    "absolute z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-cf-border bg-cf-surface p-2 shadow-[var(--shadow-panel-lg)]",
                    resultsDropdownClassName || "w-full",
                  ].join(" ")}
                >
                  {loading && (
                    <div className="space-y-2 px-1 py-1">
                      <div className="cf-loading-skeleton h-12 rounded-xl bg-cf-surface-soft" />
                      <div className="cf-loading-skeleton h-12 rounded-xl bg-cf-surface-soft" />
                    </div>
                  )}
                  {!loading && error && <Notice tone="danger">{error}</Notice>}
                  {!loading && !error && results.length > 0 && (
                    <ul className="space-y-1">
                      {results.map((patient) => (
                        <li key={patient.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            onClick={() => handleSelect(patient)}
                            className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-cf-surface-soft"
                          >
                            <div className="min-w-0 flex-1">
                              <PatientNameLine
                                patient={patient}
                                className="text-sm"
                              />
                              <PatientDobMrnLine
                                patient={patient}
                                className="mt-0.5"
                              />
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-cf-text-subtle transition group-hover:translate-x-0.5 group-hover:text-cf-text" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!loading &&
                    !error &&
                    query.trim().length >= 2 &&
                    results.length === 0 && (
                      <div className="space-y-3 rounded-xl border border-dashed border-cf-border bg-cf-surface-muted/35 px-3 py-4 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-cf-border bg-cf-surface text-cf-text-subtle">
                          <UserRoundCheck className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-cf-text">
                          No patient found
                        </p>
                        {showNoResultActions &&
                        (onOpenCreatePatient ||
                          (showDetailedSearch && onOpenDetailedSearch)) ? (
                          <div className="flex justify-center gap-2">
                            {onOpenCreatePatient ? (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={onOpenCreatePatient}
                              >
                                Create
                              </Button>
                            ) : null}
                            {showDetailedSearch && onOpenDetailedSearch ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={onOpenDetailedSearch}
                              >
                                Advanced Search
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                </div>
              )}
            </div>

            {showDetailedSearch || recentPatients.length > 0 ? (
              <div
                className={[
                  "relative inline-flex shrink-0 items-center rounded-xl border border-cf-border bg-cf-surface shadow-sm",
                  compactSelected ? "h-[42px]" : "h-10",
                ].join(" ")}
              >
                {showDetailedSearch ? (
                  <button
                    type="button"
                    onClick={onOpenDetailedSearch}
                    className={[
                      "inline-flex h-9 w-10 items-center justify-center text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text",
                      recentPatients.length > 0 ? "rounded-l-xl" : "rounded-xl",
                    ].join(" ")}
                    aria-label="Open advanced patient search"
                    title="Advanced search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                ) : null}

                {recentPatients.length > 0 ? (
                  <>
                    {showDetailedSearch ? (
                      <div className="h-5 w-px bg-cf-border" />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setShowRecentPatients((prev) => !prev);
                        setShowResults(false);
                      }}
                      className={[
                        "inline-flex h-9 w-9 items-center justify-center text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text",
                        showDetailedSearch ? "rounded-r-xl" : "rounded-xl",
                      ].join(" ")}
                      aria-label="Open recent patients"
                      title="Recent patients"
                    >
                      <ChevronDown
                        className={[
                          "h-4 w-4 transition-transform duration-200",
                          showRecentPatients ? "rotate-180" : "rotate-0",
                        ].join(" ")}
                      />
                    </button>
                  </>
                ) : null}

                {recentPatients.length > 0 && showRecentPatients ? (
                  <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-cf-border bg-cf-surface p-2 shadow-[var(--shadow-panel-lg)]">
                    <ul className="max-h-72 space-y-1 overflow-y-auto">
                      {recentPatients.map((patient) => (
                        <li key={patient.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(patient)}
                            className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-cf-surface-soft"
                          >
                            <div className="min-w-0 flex-1">
                              <PatientNameLine
                                patient={patient}
                                className="text-sm"
                              />
                              <PatientDobMrnLine
                                patient={patient}
                                className="mt-0.5"
                              />
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-cf-text-subtle transition group-hover:translate-x-0.5 group-hover:text-cf-text" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
