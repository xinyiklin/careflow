import { useEffect, useMemo, useRef, useState } from "react";

import { searchPatients } from "../api/patients";
import { parsePatientQuery } from "../utils/parsePatientQuery";
import {
  MatchQueueHeader,
  PatientSearchHeader,
  PatientSearchInputPanel,
  ResultsPagination,
} from "./PatientSearchModalChrome";
import {
  PatientSearchEmptyState,
  PatientResultRow,
  PatientResultSkeleton,
  SelectedPatientPanel,
} from "./PatientSearchModalParts";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
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
  const resultLabel =
    results.length === 1 ? "1 match" : `${results.length} matches`;
  const searchStatusLabel = results.length
    ? resultLabel
    : canSearch
      ? loading
        ? "Searching"
        : "No match"
      : "Ready";
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
        className="fixed flex max-h-[min(94dvh,840px)] w-full max-w-[76rem] flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <PatientSearchHeader
          dragHandleProps={dragHandleProps}
          onClose={onClose}
          onOpenCreatePatient={onOpenCreatePatient}
        />

        <PatientSearchInputPanel
          error={error}
          page={page}
          searchStatusLabel={searchStatusLabel}
          smartQuery={smartQuery}
          totalPages={totalPages}
          onSmartQueryChange={setSmartQuery}
        />

        <div className="relative z-10 grid min-h-[28rem] flex-1 gap-0 border-y border-cf-border bg-cf-surface lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-hidden bg-cf-surface">
            <MatchQueueHeader
              canSearch={canSearch}
              loading={loading}
              resultLabel={resultLabel}
              selected={!!selectedPatient}
            />

            <div className="min-h-0 max-h-full overflow-auto">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <PatientResultSkeleton key={index} />
                  ))
                : null}

              {!loading && paginatedResults.length === 0 ? (
                <PatientSearchEmptyState
                  canSearch={canSearch}
                  onOpenCreatePatient={onOpenCreatePatient}
                />
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
                <ResultsPagination
                  page={page}
                  totalPages={totalPages}
                  onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
                  onNext={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                />
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
