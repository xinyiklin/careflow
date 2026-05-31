import { useEffect, useMemo, useRef, useState } from "react";

import { searchPatients } from "../api/patients";
import { parsePatientQuery } from "../utils/parsePatientQuery";
import {
  PatientSearchHeader,
  ResultsPagination,
} from "./PatientSearchModalChrome";
import {
  PatientSearchEmptyState,
  PatientResultRow,
  PatientResultSkeleton,
  SelectedPatientPanel,
} from "./PatientSearchModalParts";
import { Notice } from "../../../shared/components/ui";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
import useModalFocusTrap from "../../../shared/hooks/useModalFocusTrap";
import { useModalPresence } from "../../../shared/hooks/useModalPresence";
import { getErrorMessage } from "../../../shared/utils/errors";

import type { EntityId } from "../../../shared/api/types";
import type { PatientRecord } from "../types";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 500;

type PatientSearchModalProps = {
  isOpen: boolean;
  facilityId?: EntityId | null;
  onClose?: () => void;
  onSelectPatient?: (patient: PatientRecord) => void;
  onOpenCreatePatient?: () => void;
  onOpenPatientProfile?: (patient: PatientRecord) => void;
  allowSelect?: boolean;
  injectedPatient?: PatientRecord | null;
  injectedPatientMode?: "create" | "edit";
};

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
}: PatientSearchModalProps) {
  const { isClosing, shouldRender } = useModalPresence(isOpen);
  const [smartQuery, setSmartQuery] = useState("");
  const [results, setResults] = useState<PatientRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<EntityId | null>(
    null
  );
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
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
  const { handlePanelKeyDown } = useModalFocusTrap(modalRef, isOpen, onClose);

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
        const data = ((await searchPatients({
          facilityId,
          search: canSearchBySmartText ? smartSearchValue : "",
          name: canSearchByName ? queryName : "",
          date_of_birth: canSearchByDob ? queryDob : "",
          chart_number: canSearchByMrn ? queryChartNumber : "",
          phone: canSearchByPhone ? queryPhone : "",
        })) ?? []) as PatientRecord[];

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
    setSelectedPatientId(injectedPatient.id ?? null);
    setPage(1);
  }, [injectedPatient, injectedPatientMode]);

  const selectedPatient = useMemo(
    () => results.find((patient) => patient.id === selectedPatientId) || null,
    [results, selectedPatientId]
  );

  const handleUsePatient = (patient: PatientRecord | null) => {
    if (!patient) return;
    setSelectedPatientId(patient.id ?? null);
    onSelectPatient?.(patient);
    onClose?.();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`cf-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4 ${
        isClosing ? "is-closing" : "is-opening"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Patient Search"
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        style={modalStyle}
        className={`cf-modal-panel fixed flex h-[min(94dvh,920px)] w-full max-w-[76rem] flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)] ${
          isClosing ? "is-closing" : "is-opening"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <PatientSearchHeader
          dragHandleProps={dragHandleProps}
          smartQuery={smartQuery}
          railCollapsed={railCollapsed}
          onSmartQueryChange={setSmartQuery}
          onToggleRail={() => setRailCollapsed((prev) => !prev)}
          onClose={onClose}
          onOpenCreatePatient={onOpenCreatePatient}
        />

        {error ? (
          <div className="shrink-0 bg-cf-surface px-4 pt-3">
            <Notice tone="danger" title="Patient search failed">
              {error}
            </Notice>
          </div>
        ) : null}

        <div
          className={[
            "relative z-10 grid min-h-[28rem] flex-1 gap-0 bg-cf-surface",
            railCollapsed ? "" : "lg:grid-cols-[minmax(0,1fr)_320px]",
          ].join(" ")}
        >
          <div className="min-h-0 overflow-auto bg-cf-surface">
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
                    key={
                      patient.id ??
                      patient.chart_number ??
                      patient.date_of_birth
                    }
                    patient={patient}
                    isSelected={patient.id === selectedPatientId}
                    allowSelect={allowSelect}
                    onSelect={() => setSelectedPatientId(patient.id ?? null)}
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
                onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              />
            ) : null}
          </div>

          {!railCollapsed ? (
            <SelectedPatientPanel
              patient={selectedPatient}
              allowSelect={allowSelect}
              onUsePatient={handleUsePatient}
              onOpenPatientProfile={onOpenPatientProfile}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
