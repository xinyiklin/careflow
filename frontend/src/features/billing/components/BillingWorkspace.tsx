import { useEffect, useMemo, useState } from "react";

import { usePatientFlowContext } from "../../patients/PatientFlowProvider";
import BillingRecordModal from "./BillingRecordModal";
import useBillingRecords from "../hooks/useBillingRecords";
import WorkspaceShell from "../../../app/components/WorkspaceShell";
import {
  BillingQueuePagination,
  BillingQueueRail,
  BillingWorkspaceHeader,
} from "./BillingWorkspaceChrome";
import BillingQueueToolbar from "./BillingQueueToolbar";
import BillingListFeedback from "./BillingWorkspaceFeedback";
import {
  BillingPendingEncounterRow,
  BillingRecordRow,
} from "./BillingWorkspaceRows";
import {
  ALL_PAYERS_FILTER,
  BILLING_QUEUE_PAGE_SIZE,
  buildBillingPayerOptions,
  calculateBillingWorkspaceSummary,
  encounterMatchesBillingSearch,
  getIssueLabel,
  matchesIssueFilter,
  matchesPayerFilter,
  matchesDateRangeFilter,
  recordMatchesBillingSearch,
  sortBillingWorkspaceItems,
  type BillingIssueFilter,
  type BillingIssueOption,
  type BillingQueueDefinition,
  type BillingQueueKey,
  type BillingSortMode,
  type BillingWorkspaceItem,
} from "./billingWorkspaceUtils";

import type { EntityId } from "../../../shared/api/types";
import type {
  ClinicalEncounter,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
} from "../types";

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BillingWorkspace({
  facilityId,
  canManage,
}: {
  facilityId: EntityId | null;
  canManage: boolean;
}) {
  const { patientFlow } = usePatientFlowContext();
  const {
    billingRecords,
    billingRecordsQuery,
    clinicalEncounters,
    clinicalEncountersQuery,
    feeScheduleItems,
    feeScheduleQuery,
    createBillingRecordMutation,
    updateBillingRecordMutation,
  } = useBillingRecords({ facilityId });

  const [activeQueue, setActiveQueue] =
    useState<BillingQueueKey>("pending_coding");
  const [activeIssueFilter, setActiveIssueFilter] =
    useState<BillingIssueFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [payerFilter, setPayerFilter] = useState(ALL_PAYERS_FILTER);
  const [sortMode, setSortMode] = useState<BillingSortMode>("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [signingFilter, setSigningFilter] = useState<
    "all" | "signed" | "unsigned"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(
    () => new Set()
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    record: EncounterBillingRecord | null;
    encounter: ClinicalEncounter | null;
  }>({
    isOpen: false,
    record: null,
    encounter: null,
  });
  const [saveError, setSaveError] = useState("");

  const billedEncounterIds = useMemo(
    () =>
      new Set(
        billingRecords
          .map((record) => record.encounter)
          .filter(Boolean)
          .map((id) => String(id))
      ),
    [billingRecords]
  );

  const pendingEncounters = useMemo(
    () =>
      clinicalEncounters.filter(
        (encounter) =>
          encounter.id &&
          !billedEncounterIds.has(String(encounter.id)) &&
          encounter.is_effectively_billable !== false
      ),
    [billedEncounterIds, clinicalEncounters]
  );

  const summary = useMemo(
    () => calculateBillingWorkspaceSummary(billingRecords, pendingEncounters),
    [billingRecords, pendingEncounters]
  );

  const queues = useMemo<BillingQueueDefinition[]>(
    () => [
      {
        id: "pending_coding",
        label: "Pending Coding",
        count: summary.pendingCount,
      },
      {
        id: "coding_needed",
        label: "Coding Queue",
        count: summary.codingCount,
      },
      {
        id: "ready_to_submit",
        label: "Submission Queue",
        count: summary.readyCount,
      },
      {
        id: "claim_created",
        label: "Claims Registry",
        count: summary.claimCount,
      },
    ],
    [summary]
  );

  const activeQueueList = useMemo<BillingWorkspaceItem[]>(() => {
    if (activeQueue === "pending_coding") {
      if (signingFilter === "signed") {
        return pendingEncounters.filter((enc) => enc.status === "signed");
      }
      if (signingFilter === "unsigned") {
        return pendingEncounters.filter((enc) => enc.status === "in_progress");
      }
      return pendingEncounters;
    }
    return billingRecords.filter((record) => record.status === activeQueue);
  }, [activeQueue, billingRecords, pendingEncounters, signingFilter]);

  const issueOptions = useMemo<BillingIssueOption[]>(() => {
    const issueIds: BillingIssueFilter[] = [
      "all",
      "missing_payer",
      "missing_coding",
      "missing_pos",
      "aged",
    ];

    return issueIds.map((issue) => ({
      id: issue,
      label: getIssueLabel(issue),
      count:
        issue === "all"
          ? activeQueueList.length
          : activeQueueList.filter((item) =>
              matchesIssueFilter(activeQueue, item, issue)
            ).length,
    }));
  }, [activeQueue, activeQueueList]);

  const payerOptions = useMemo(() => {
    return buildBillingPayerOptions(activeQueueList);
  }, [activeQueueList]);

  const searchMatchedList = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return activeQueueList;

    if (activeQueue === "pending_coding") {
      return activeQueueList.filter((item) =>
        encounterMatchesBillingSearch(item as ClinicalEncounter, query)
      );
    }

    return activeQueueList.filter((item) =>
      recordMatchesBillingSearch(item as EncounterBillingRecord, query)
    );
  }, [activeQueue, activeQueueList, searchTerm]);

  const filteredList = useMemo(
    () =>
      searchMatchedList
        .filter((item) => matchesPayerFilter(activeQueue, item, payerFilter))
        .filter((item) =>
          matchesIssueFilter(activeQueue, item, activeIssueFilter)
        )
        .filter((item) =>
          matchesDateRangeFilter(activeQueue, item, startDate, endDate)
        ),
    [
      activeIssueFilter,
      activeQueue,
      payerFilter,
      searchMatchedList,
      startDate,
      endDate,
    ]
  );

  const sortedList = useMemo(
    () => sortBillingWorkspaceItems(activeQueue, filteredList, sortMode),
    [activeQueue, filteredList, sortMode]
  );
  const pageCount = Math.max(
    1,
    Math.ceil(sortedList.length / BILLING_QUEUE_PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safeCurrentPage - 1) * BILLING_QUEUE_PAGE_SIZE;
  const pageEndIndex = Math.min(
    pageStartIndex + BILLING_QUEUE_PAGE_SIZE,
    sortedList.length
  );
  const paginatedList = useMemo(
    () => sortedList.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, sortedList]
  );

  const isBilledList = activeQueue !== "pending_coding";
  const isLoading =
    billingRecordsQuery.isLoading || clinicalEncountersQuery.isLoading;
  const loadError = billingRecordsQuery.error || clinicalEncountersQuery.error;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeIssueFilter,
    activeQueue,
    endDate,
    payerFilter,
    searchTerm,
    signingFilter,
    sortMode,
    startDate,
  ]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleQueueChange = (queue: BillingQueueKey) => {
    setActiveQueue(queue);
    setSearchTerm("");
    setActiveIssueFilter("all");
    setPayerFilter(ALL_PAYERS_FILTER);
    setStartDate("");
    setEndDate(getTodayDateString());
    setSigningFilter("all");
  };

  const handleOpenPatientHub = (patientId?: EntityId | null) => {
    if (patientId) {
      patientFlow.hub.openById(patientId, { initialTab: "billing" });
    }
  };

  const handleSave = async (values: EncounterBillingRecordPayload) => {
    setSaveError("");

    try {
      if (modalState.record?.id) {
        await updateBillingRecordMutation.mutateAsync({
          billingRecordId: modalState.record.id,
          values,
        });
      } else {
        await createBillingRecordMutation.mutateAsync(values);
      }
      setModalState({ isOpen: false, record: null, encounter: null });
    } catch {
      setSaveError(
        "Failed to save billing record. Please check validation and try again."
      );
    }
  };

  return (
    <WorkspaceShell>
      <BillingWorkspaceHeader summary={summary} />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-cf-surface md:grid-cols-[240px_minmax(0,1fr)]">
        <BillingQueueRail
          queues={queues}
          activeQueue={activeQueue}
          onQueueChange={handleQueueChange}
          issueOptions={issueOptions}
          activeIssueFilter={activeIssueFilter}
          onIssueFilterChange={setActiveIssueFilter}
          providerLoad={summary.providerLoad}
        />

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-cf-surface">
          <BillingQueueToolbar
            activeQueue={activeQueue}
            searchTerm={searchTerm}
            payerFilter={payerFilter}
            payerOptions={payerOptions}
            sortMode={sortMode}
            startDate={startDate}
            endDate={endDate}
            signingFilter={signingFilter}
            onSearchTermChange={setSearchTerm}
            onPayerFilterChange={setPayerFilter}
            onSortModeChange={setSortMode}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSigningFilterChange={setSigningFilter}
          />

          <div className="min-h-0 flex-1 overflow-y-auto bg-cf-surface-muted/30 p-5">
            {isLoading ? (
              <BillingListFeedback kind="loading" />
            ) : loadError ? (
              <BillingListFeedback
                kind="error"
                onRetry={() => {
                  void billingRecordsQuery.refetch();
                  void clinicalEncountersQuery.refetch();
                  void feeScheduleQuery.refetch();
                }}
              />
            ) : sortedList.length ? (
              <div className="space-y-2.5 pb-4">
                {isBilledList
                  ? (paginatedList as EncounterBillingRecord[]).map(
                      (record) => {
                        const rowId =
                          record.id ||
                          record.encounter ||
                          `${record.patient_name}-${record.updated_at}`;
                        return (
                          <BillingRecordRow
                            key={rowId}
                            record={record}
                            isExpanded={expandedIds.has(rowId)}
                            canManage={canManage}
                            roomierActions={activeQueue !== "coding_needed"}
                            onOpenPatientHub={handleOpenPatientHub}
                            onEdit={(selectedRecord) =>
                              setModalState({
                                isOpen: true,
                                record: selectedRecord,
                                encounter: null,
                              })
                            }
                            onToggleExpand={() => toggleExpand(rowId)}
                          />
                        );
                      }
                    )
                  : (paginatedList as ClinicalEncounter[]).map((encounter) => (
                      <BillingPendingEncounterRow
                        key={encounter.id}
                        encounter={encounter}
                        canManage={canManage}
                        onOpenPatientHub={handleOpenPatientHub}
                        onCreateSuperbill={(selectedEncounter) =>
                          setModalState({
                            isOpen: true,
                            record: null,
                            encounter: selectedEncounter,
                          })
                        }
                      />
                    ))}
                <BillingQueuePagination
                  currentPage={safeCurrentPage}
                  pageCount={pageCount}
                  totalCount={sortedList.length}
                  startItem={pageStartIndex + 1}
                  endItem={pageEndIndex}
                  onPageChange={setCurrentPage}
                />
              </div>
            ) : (
              <BillingListFeedback kind="empty" searchTerm={searchTerm} />
            )}
          </div>
        </div>
      </div>

      {modalState.isOpen ? (
        <BillingRecordModal
          isOpen={modalState.isOpen}
          record={modalState.record}
          encounter={modalState.encounter}
          facilityId={facilityId}
          feeScheduleItems={feeScheduleItems}
          saving={
            createBillingRecordMutation.isPending ||
            updateBillingRecordMutation.isPending
          }
          error={saveError}
          onClose={() =>
            setModalState({ isOpen: false, record: null, encounter: null })
          }
          onSave={handleSave}
        />
      ) : null}
    </WorkspaceShell>
  );
}
