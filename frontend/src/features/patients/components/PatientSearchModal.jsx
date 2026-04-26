import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  UserRoundCheck,
  UserPlus,
  X,
} from "lucide-react";

import { searchPatients } from "../api/patients";
import { parsePatientQuery } from "../utils/parsePatientQuery";
import {
  PatientResultRow,
  PatientResultSkeleton,
  SelectedPatientPanel,
} from "./PatientSearchModalParts";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
import { Button, Input, Notice } from "../../../shared/components/ui";
import { getErrorMessage } from "../../../shared/utils/errors";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 500;

export default function PatientSearchModal({
  isOpen,
  facilityId,
  onClose,
  onSelectPatient,
  onOpenCreatePatient,
  onOpenPatientProfile,
  allowSelect = true,
  injectedPatient,
  injectedPatientMode,
}) {
  const [smartQuery, setSmartQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const searchRequestIdRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const parsedSmartQuery = useMemo(
    () => parsePatientQuery(smartQuery.trim()),
    [smartQuery]
  );
  const smartSearchValue = smartQuery.trim();
  const canSearch = smartSearchValue.length >= 2;
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, page]);

  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setSmartQuery("");
    setResults([]);
    setSelectedPatientId(null);
    setPage(1);
    setError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const queryName = parsedSmartQuery.name;
    const queryChartNumber = parsedSmartQuery.chart_number;
    const queryDob = parsedSmartQuery.date_of_birth;
    const queryPhone = parsedSmartQuery.phone;
    const canSearchByName = queryName.trim().length >= 2;
    const canSearchByMrn = queryChartNumber.trim().length >= 1;
    const canSearchByDob = !!queryDob;
    const canSearchByPhone = queryPhone.trim().length >= 7;
    const canSearchBySmartText =
      smartSearchValue.length >= 2 &&
      !parsedSmartQuery.name &&
      !parsedSmartQuery.chart_number &&
      !parsedSmartQuery.date_of_birth &&
      !parsedSmartQuery.phone;

    if (
      !canSearchByName &&
      !canSearchByMrn &&
      !canSearchByDob &&
      !canSearchByPhone &&
      !canSearchBySmartText
    ) {
      setLoading(false);
      setResults([]);
      setSelectedPatientId(null);
      setPage(1);
      setError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;

      try {
        setLoading(true);
        setError("");
        const data = await searchPatients({
          facilityId,
          search: canSearchBySmartText ? smartSearchValue : "",
          name: canSearchByName ? queryName : "",
          date_of_birth: canSearchByDob ? queryDob : "",
          chart_number: canSearchByMrn ? queryChartNumber : "",
          phone: canSearchByPhone ? queryPhone : "",
        });

        if (searchRequestIdRef.current !== requestId) return;

        setResults(data);
        setPage(1);
        setSelectedPatientId((prevSelectedId) =>
          data.some((patient) => patient.id === prevSelectedId)
            ? prevSelectedId
            : data[0]?.id || null
        );
      } catch (err) {
        if (searchRequestIdRef.current !== requestId) return;
        setError(getErrorMessage(err, "Failed to search patients."));
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [facilityId, isOpen, parsedSmartQuery, smartSearchValue]);

  useEffect(() => {
    if (!injectedPatient) return;
    if (injectedPatientMode === "edit") {
      setResults((prev) =>
        prev.map((p) => (p.id === injectedPatient.id ? injectedPatient : p))
      );
    } else {
      setResults([injectedPatient]);
    }
    setSelectedPatientId(injectedPatient.id);
    setPage(1);
  }, [injectedPatient, injectedPatientMode]);

  const selectedPatient = useMemo(
    () => results.find((patient) => patient.id === selectedPatientId) || null,
    [results, selectedPatientId]
  );

  const handleUsePatient = (patient) => {
    if (!patient) return;
    setSelectedPatientId(patient.id);
    onSelectPatient?.(patient);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="fixed flex max-h-[min(90dvh,760px)] w-full max-w-[72rem] flex-col overflow-hidden rounded-[1.7rem] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...dragHandleProps}
          className="flex cursor-move select-none items-center justify-between gap-4 border-b border-cf-border bg-[linear-gradient(180deg,var(--color-surface),var(--color-surface-muted))] px-5 py-4"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Patient Search · Compact Match Desk
            </div>
            <div className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-cf-text">
              {allowSelect ? "Attach patient" : "Find patient"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onOpenCreatePatient}
              className="bg-cf-text text-white hover:bg-cf-text/90"
            >
              <UserPlus className="h-4 w-4" />
              New patient
            </Button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="bg-cf-page-bg px-5 pt-4">
          {error && (
            <Notice tone="danger" title="Patient search failed">
              {error}
            </Notice>
          )}

          <div className={error ? "mt-3" : ""}>
            <div className="rounded-3xl border border-cf-border bg-cf-surface-muted/55 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-text-subtle" />
                <Input
                  type="text"
                  value={smartQuery}
                  onChange={(event) => setSmartQuery(event.target.value)}
                  aria-label="Smart patient search"
                  className="h-12 rounded-2xl border-cf-border bg-cf-surface pl-10 pr-24 text-sm font-semibold focus:border-cf-border-strong focus:ring-0"
                  autoFocus
                />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-cf-text-subtle">
                  {results.length > 0
                    ? `${results.length} match${results.length === 1 ? "" : "es"}`
                    : canSearch
                      ? loading
                        ? "Searching"
                        : "No matches"
                      : "Type a clue"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid min-h-0 flex-1 bg-cf-page-bg px-5 pb-4 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 overflow-hidden rounded-t-3xl border border-cf-border bg-cf-surface lg:rounded-l-3xl lg:rounded-tr-none lg:border-r-0">
            <div className="min-h-0 max-h-full overflow-auto">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <PatientResultSkeleton key={index} />
                  ))
                : null}

              {!loading && paginatedResults.length === 0 ? (
                <div className="flex min-h-[20rem] items-center justify-center px-5 py-10 text-center">
                  <div className="mx-auto max-w-md">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface-muted text-cf-text-subtle">
                      {canSearch ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <UserRoundCheck className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-4 text-base font-semibold text-cf-text">
                      {canSearch
                        ? "No patients found"
                        : "Start with any patient clue"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-cf-text-muted">
                      {canSearch
                        ? "Create only after confirming name and DOB."
                        : "Search by name, MRN, DOB, or phone. The best match is selected automatically."}
                    </div>
                    {canSearch ? (
                      <Button
                        type="button"
                        variant="default"
                        className="mt-5"
                        onClick={onOpenCreatePatient}
                      >
                        <UserPlus className="h-4 w-4" />
                        Create Patient
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!loading && paginatedResults.length > 0
                ? paginatedResults.map((patient) => (
                    <PatientResultRow
                      key={patient.id}
                      patient={patient}
                      isSelected={patient.id === selectedPatientId}
                      allowSelect={allowSelect}
                      onSelect={() => setSelectedPatientId(patient.id)}
                      onUsePatient={handleUsePatient}
                      onOpenPatientProfile={onOpenPatientProfile}
                    />
                  ))
                : null}

              {!loading && results.length > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cf-border px-4 py-3">
                  <div className="text-sm text-cf-text-muted">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <SelectedPatientPanel
            patient={selectedPatient}
            allowSelect={allowSelect}
            onUsePatient={handleUsePatient}
            onOpenPatientProfile={onOpenPatientProfile}
          />
        </div>
      </div>
    </div>
  );
}
