import type { ClinicalEncounter, EncounterBillingRecord } from "../types";

export type BillingQueueKey =
  | "pending_coding"
  | "coding_needed"
  | "ready_to_submit"
  | "claim_created";

export type BillingSortMode =
  | "newest"
  | "oldest"
  | "charge-desc"
  | "charge-asc"
  | "patient-name";

export type BillingIssueFilter =
  | "all"
  | "missing_payer"
  | "missing_coding"
  | "missing_pos"
  | "aged";

export type BillingWorkspaceItem = ClinicalEncounter | EncounterBillingRecord;

export type BillingQueueDefinition = {
  id: BillingQueueKey;
  label: string;
  count: number;
};

export type BillingIssueOption = {
  id: BillingIssueFilter;
  label: string;
  count: number;
};

export type BillingMixItem = {
  label: string;
  count: number;
  amount: number;
};

export type BillingPayerOption = {
  id: string;
  label: string;
  count: number;
};

export type BillingWorkspaceSummary = {
  totalRecords: number;
  pendingCount: number;
  codingCount: number;
  readyCount: number;
  claimCount: number;
  totalCharges: number;
  readyCharges: number;
  claimCharges: number;
  missingPayerCount: number;
  codingGapCount: number;
  missingPosCount: number;
  agedCount: number;
  providerLoad: BillingMixItem[];
};

export const BILLING_AGING_DAYS = 7;
export const ALL_PAYERS_FILTER = "all";
export const MISSING_PAYER_FILTER = "__missing_payer__";
export const BILLING_QUEUE_PAGE_SIZE = 10;

export const SORT_OPTIONS: { id: BillingSortMode; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "charge-desc", label: "Charges: High to Low" },
  { id: "charge-asc", label: "Charges: Low to High" },
  { id: "patient-name", label: "Patient Name A-Z" },
];

const ISSUE_LABELS: Record<BillingIssueFilter, string> = {
  all: "All work",
  missing_payer: "Missing payer",
  missing_coding: "Coding gaps",
  missing_pos: "Missing POS",
  aged: "Aging 7d",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function compactLabel(value?: string | number | null, fallback = "Not set") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function getPayerFilterValue(item: BillingWorkspaceItem) {
  const payerName = item.payer_name?.trim();
  return payerName || MISSING_PAYER_FILTER;
}

export function getPayerFilterLabel(value: string) {
  if (value === MISSING_PAYER_FILTER) return "Payer not set";
  return value;
}
export function buildBillingPayerOptions(items: BillingWorkspaceItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getPayerFilterValue(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: getPayerFilterLabel(id),
      count,
    }))
    .sort((a, b) => {
      if (a.id === MISSING_PAYER_FILTER) return 1;
      if (b.id === MISSING_PAYER_FILTER) return -1;
      return a.label.localeCompare(b.label);
    });
}

export function getIssueLabel(issue: BillingIssueFilter) {
  return ISSUE_LABELS[issue] || ISSUE_LABELS.all;
}
export function getIssueBadgeVariant(issue: BillingIssueFilter) {
  return issue === "aged" ? "warning" : "outline";
}
export function toBillingAmount(value?: string | number | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatBillingCurrency(value?: string | number | null) {
  return `$${toBillingAmount(value).toFixed(2)}`;
}

export function formatBillingDate(value?: string | null) {
  const dateOnlyMatch = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[2]}/${dateOnlyMatch[3]}/${dateOnlyMatch[1]}`;
  }

  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Date not set";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function getRecordChargeAmount(record: EncounterBillingRecord) {
  return toBillingAmount(record.total_charge_amount);
}

function getSearchText(value?: string | number | null) {
  return String(value ?? "").toLowerCase();
}

export function recordMatchesBillingSearch(
  record: EncounterBillingRecord,
  query: string
) {
  const matchDiagnosis = (record.diagnoses || []).some((diagnosis) =>
    getSearchText(diagnosis.code).includes(query)
  );
  const matchService = (record.charge_lines || []).some((line) =>
    getSearchText(line.service_code).includes(query)
  );

  return (
    getSearchText(record.patient_name).includes(query) ||
    getSearchText(record.patient_chart_number).includes(query) ||
    getSearchText(record.rendering_provider_name).includes(query) ||
    getSearchText(record.payer_name).includes(query) ||
    matchDiagnosis ||
    matchService
  );
}

export function encounterMatchesBillingSearch(
  encounter: ClinicalEncounter,
  query: string
) {
  return (
    getSearchText(encounter.patient_name).includes(query) ||
    getSearchText(encounter.patient_chart_number).includes(query) ||
    getSearchText(encounter.rendering_provider_name).includes(query) ||
    getSearchText(encounter.reason).includes(query) ||
    getSearchText(encounter.appointment_type_name).includes(query)
  );
}

export function getTimeValue(value?: string | null) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getRecordActivityAt(record: EncounterBillingRecord) {
  return (
    record.updated_at || record.appointment_time || record.created_at || ""
  );
}

export function getEncounterActivityAt(encounter: ClinicalEncounter) {
  return (
    encounter.progress_note?.signed_at ||
    encounter.appointment_time ||
    encounter.started_at ||
    encounter.updated_at ||
    ""
  );
}

function daysSince(value?: string | null) {
  const time = getTimeValue(value);
  if (!time) return null;
  const diff = Date.now() - time;
  return Math.max(0, Math.floor(diff / DAY_MS));
}

export function getAgeLabel(value?: string | null) {
  const days = daysSince(value);
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  return `${days}d`;
}

export function getAgeBadgeVariant(value?: string | null) {
  const days = daysSince(value);
  if (days === null || days < BILLING_AGING_DAYS) return "neutral";
  if (days >= BILLING_AGING_DAYS * 2) return "danger";
  return "warning";
}

export function isBillingAged(value?: string | null) {
  const days = daysSince(value);
  return days !== null && days >= BILLING_AGING_DAYS;
}

export function getRecordIssueFilters(record: EncounterBillingRecord) {
  const issues: BillingIssueFilter[] = [];
  const hasDiagnosis = (record.diagnoses || []).some((dx) =>
    Boolean(dx.code?.trim())
  );
  const hasChargeLine = (record.charge_lines || []).some((line) =>
    Boolean(line.service_code?.trim())
  );

  if (!record.payer_name?.trim()) issues.push("missing_payer");
  if (!hasDiagnosis || !hasChargeLine) issues.push("missing_coding");
  if (!record.place_of_service?.trim()) issues.push("missing_pos");
  if (isBillingAged(getRecordActivityAt(record))) issues.push("aged");

  return issues;
}

export function getEncounterIssueFilters(encounter: ClinicalEncounter) {
  const issues: BillingIssueFilter[] = [];
  if (isBillingAged(getEncounterActivityAt(encounter))) issues.push("aged");
  return issues;
}

export function matchesIssueFilter(
  activeQueue: BillingQueueKey,
  item: BillingWorkspaceItem,
  issue: BillingIssueFilter
) {
  if (issue === "all") return true;
  if (activeQueue === "pending_coding") {
    return getEncounterIssueFilters(item as ClinicalEncounter).includes(issue);
  }
  return getRecordIssueFilters(item as EncounterBillingRecord).includes(issue);
}

export function matchesPayerFilter(
  activeQueue: BillingQueueKey,
  item: BillingWorkspaceItem,
  payerFilter: string
) {
  if (payerFilter === ALL_PAYERS_FILTER) return true;
  return getPayerFilterValue(item) === payerFilter;
}

export function matchesDateRangeFilter(
  activeQueue: BillingQueueKey,
  item: BillingWorkspaceItem,
  startDateStr: string,
  endDateStr: string
) {
  if (!startDateStr && !endDateStr) return true;

  const activityTimeStr =
    activeQueue === "pending_coding"
      ? getEncounterActivityAt(item as ClinicalEncounter)
      : getRecordActivityAt(item as EncounterBillingRecord);

  if (!activityTimeStr) return false;

  const activityDate = new Date(activityTimeStr);
  if (Number.isNaN(activityDate.getTime())) return false;

  const itemTime = activityDate.getTime();

  if (startDateStr) {
    const start = new Date(startDateStr + "T00:00:00");
    if (itemTime < start.getTime()) return false;
  }

  if (endDateStr) {
    const end = new Date(endDateStr + "T23:59:59");
    if (itemTime > end.getTime()) return false;
  }

  return true;
}

export function sortBillingWorkspaceItems(
  activeQueue: BillingQueueKey,
  items: BillingWorkspaceItem[],
  sortMode: BillingSortMode
) {
  if (activeQueue === "pending_coding") {
    return [...items].sort((a, b) => {
      const encounterA = a as ClinicalEncounter;
      const encounterB = b as ClinicalEncounter;
      if (sortMode === "oldest") {
        return (
          getTimeValue(getEncounterActivityAt(encounterA)) -
          getTimeValue(getEncounterActivityAt(encounterB))
        );
      }
      if (sortMode === "patient-name") {
        return (encounterA.patient_name || "").localeCompare(
          encounterB.patient_name || ""
        );
      }
      return (
        getTimeValue(getEncounterActivityAt(encounterB)) -
        getTimeValue(getEncounterActivityAt(encounterA))
      );
    });
  }

  return [...items].sort((a, b) => {
    const recordA = a as EncounterBillingRecord;
    const recordB = b as EncounterBillingRecord;
    if (sortMode === "oldest") {
      return (
        getTimeValue(getRecordActivityAt(recordA)) -
        getTimeValue(getRecordActivityAt(recordB))
      );
    }
    if (sortMode === "charge-desc") {
      return getRecordChargeAmount(recordB) - getRecordChargeAmount(recordA);
    }
    if (sortMode === "charge-asc") {
      return getRecordChargeAmount(recordA) - getRecordChargeAmount(recordB);
    }
    if (sortMode === "patient-name") {
      return (recordA.patient_name || "").localeCompare(
        recordB.patient_name || ""
      );
    }
    return (
      getTimeValue(getRecordActivityAt(recordB)) -
      getTimeValue(getRecordActivityAt(recordA))
    );
  });
}

function addMixValue(
  map: Map<string, BillingMixItem>,
  label: string,
  amount = 0
) {
  const key = compactLabel(label);
  const next = map.get(key) || { label: key, count: 0, amount: 0 };
  next.count += 1;
  next.amount += amount;
  map.set(key, next);
}

function sortedMix(map: Map<string, BillingMixItem>) {
  return [...map.values()]
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, 4);
}

export function calculateBillingWorkspaceSummary(
  records: EncounterBillingRecord[],
  pendingEncounters: ClinicalEncounter[]
): BillingWorkspaceSummary {
  const providerMap = new Map<string, BillingMixItem>();
  const summary: BillingWorkspaceSummary = {
    totalRecords: records.length,
    pendingCount: pendingEncounters.length,
    codingCount: 0,
    readyCount: 0,
    claimCount: 0,
    totalCharges: 0,
    readyCharges: 0,
    claimCharges: 0,
    missingPayerCount: 0,
    codingGapCount: 0,
    missingPosCount: 0,
    agedCount: 0,
    providerLoad: [],
  };

  for (const encounter of pendingEncounters) {
    addMixValue(
      providerMap,
      encounter.rendering_provider_name || "Provider not set"
    );
    if (getEncounterIssueFilters(encounter).includes("aged")) {
      summary.agedCount += 1;
    }
  }

  for (const record of records) {
    const amount = getRecordChargeAmount(record);
    const status = record.status || "coding_needed";
    const issues = getRecordIssueFilters(record);

    summary.totalCharges += amount;
    if (status === "coding_needed") summary.codingCount += 1;
    if (status === "ready_to_submit") {
      summary.readyCount += 1;
      summary.readyCharges += amount;
    }
    if (status === "claim_created") {
      summary.claimCount += 1;
      summary.claimCharges += amount;
    }

    if (issues.includes("missing_payer")) summary.missingPayerCount += 1;
    if (issues.includes("missing_coding")) summary.codingGapCount += 1;
    if (issues.includes("missing_pos")) summary.missingPosCount += 1;
    if (issues.includes("aged")) summary.agedCount += 1;

    addMixValue(
      providerMap,
      record.rendering_provider_name || "Provider not set",
      amount
    );
  }

  summary.providerLoad = sortedMix(providerMap);
  return summary;
}
