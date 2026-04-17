import { useEffect, useMemo, useRef, useState } from "react";
import { searchPatients } from "../api/patients";
import { parsePatientQuery } from "../utils/parsePatientQuery";
import { format, parseISO } from "date-fns";
import { formatDOB } from "../../../shared/utils/dateTime";

export default function PatientSearchField({
  selectedPatient,
  onSelectPatient,
  onOpenDetailedSearch,
  onOpenCreatePatient,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
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
        console.log(parsed);

        const searchPayload =
          parsed.name || parsed.date_of_birth || parsed.chart_number
            ? {
                name: parsed.name,
                date_of_birth: parsed.date_of_birth,
                chart_number: parsed.chart_number,
              }
            : { search: cleanQuery };

        const data = await searchPatients(searchPayload);

        setResults(data);
        setShowResults(true);
      } catch (err) {
        console.error(err);
        setError("Failed to search patients.");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cleanQuery]);

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const clearSelectedPatient = () => {
    onSelectPatient(null);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {selectedPatient ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {`${selectedPatient.last_name}, ${selectedPatient.first_name}`}
            </p>
            <p className="text-xs text-slate-500">
              DOB: {formatDOB(selectedPatient.date_of_birth)}
              {selectedPatient.chart_number
                ? ` • MRN: ${selectedPatient.chart_number}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={clearSelectedPatient}
            className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-200"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setShowResults(true);
                }}
                placeholder="Search patient (Last, First or Last Name)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              {showResults && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {loading && (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      Searching...
                    </div>
                  )}

                  {!loading && error && (
                    <div className="px-3 py-2 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {!loading && !error && results.length > 0 && (
                    <ul>
                      {results.map((patient) => (
                        <li key={patient.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(patient)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <div className="text-sm font-medium text-slate-900">
                              {`${patient.last_name}, ${patient.first_name}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              DOB: {formatDOB(patient.date_of_birth)}
                              {patient.chart_number
                                ? ` • MRN: ${patient.chart_number}`
                                : ""}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!loading &&
                    !error &&
                    query.trim().length >= 2 &&
                    results.length === 0 && (
                      <div className="space-y-2 px-3 py-3">
                        <p className="text-sm text-slate-500">
                          No patient found.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={onOpenCreatePatient}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Create New Patient
                          </button>
                          <button
                            type="button"
                            onClick={onOpenDetailedSearch}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Advanced Search
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenDetailedSearch}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              title="Advanced search"
            >
              Search
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Quick search supports “Last, First” or just last name.
          </p>
        </>
      )}
    </div>
  );
}
