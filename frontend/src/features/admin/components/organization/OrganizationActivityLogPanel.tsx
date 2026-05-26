import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileJson,
  RefreshCw,
  Search,
} from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import useOrganizationFacilities from "../../hooks/organization/useOrganizationFacilities";
import useOrganizationActivityLog from "../../hooks/organization/useOrganizationActivityLog";
import {
  AdminListToolbar,
  AdminTableCard,
  AdminTableLoadError,
} from "../shared/AdminSurface";
import { compareText } from "../../hooks/shared/useAdminListControls";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../../shared/utils/dateTime";
import type { AdminAuditEvent } from "../../types";
import type { EntityId } from "../../../../shared/api/types";

const LOG_SORT_OPTIONS: Array<{
  key: string;
  label: string;
  compare: (a: AdminAuditEvent, b: AdminAuditEvent) => number;
}> = [
  {
    key: "newest",
    label: "Newest first",
    compare: (a, b) => compareText(b.created_at, a.created_at),
  },
  {
    key: "oldest",
    label: "Oldest first",
    compare: (a, b) => compareText(a.created_at, b.created_at),
  },
  {
    key: "actor",
    label: "Actor",
    compare: (a, b) =>
      compareText(a.actor_name, b.actor_name) ||
      compareText(b.created_at, a.created_at),
  },
  {
    key: "action",
    label: "Action type",
    compare: (a, b) =>
      compareText(a.action, b.action) ||
      compareText(b.created_at, a.created_at),
  },
];

const PAGE_SIZE = 25;

const ACTION_BADGES: Record<
  string,
  "success" | "warning" | "danger" | "neutral" | "outline"
> = {
  create: "success",
  update: "warning",
  delete: "danger",
  login: "outline",
  export: "neutral",
  view: "neutral",
  other: "neutral",
};

type OrganizationActivityLogPanelProps = {
  facilityId?: EntityId | null;
  scopeLabel?: string;
  scope?: "organization" | "facility" | null;
  showFacilityFilter?: boolean;
};

export default function OrganizationActivityLogPanel({
  facilityId = null,
  scopeLabel = "organization",
  scope = null,
  showFacilityFilter = true,
}: OrganizationActivityLogPanelProps = {}) {
  const [actionFilter, setActionFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSort, setActiveSort] = useState("newest");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { facilities = [] } = useOrganizationFacilities({
    enabled: showFacilityFilter,
  });

  const queryParams = useMemo(() => {
    return {
      action: actionFilter !== "all" ? actionFilter : null,
      app_label: appFilter !== "all" ? appFilter : null,
      facility:
        facilityId ||
        (showFacilityFilter && facilityFilter !== "all"
          ? facilityFilter
          : null),
      scope,
    };
  }, [
    actionFilter,
    appFilter,
    facilityFilter,
    facilityId,
    scope,
    showFacilityFilter,
  ]);

  const canLoadEvents = true;
  const {
    events = [],
    loading,
    loadError,
    reload,
  } = useOrganizationActivityLog(queryParams, { enabled: canLoadEvents });

  const visibleEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? events.filter((event) => {
          const matchActor = event.actor_name?.toLowerCase().includes(query);
          const matchSummary = event.summary?.toLowerCase().includes(query);
          const matchPatient = event.patient_name
            ?.toLowerCase()
            .includes(query);
          const matchModel = event.model_name?.toLowerCase().includes(query);
          const matchId = String(event.id).includes(query);
          return (
            matchActor || matchSummary || matchPatient || matchModel || matchId
          );
        })
      : events;

    const sorter =
      LOG_SORT_OPTIONS.find((o) => o.key === activeSort) || LOG_SORT_OPTIONS[0];
    return filtered.slice().sort(sorter.compare);
  }, [events, searchQuery, activeSort]);

  const pageCount = Math.max(1, Math.ceil(visibleEvents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedEvents = visibleEvents.slice(startIdx, startIdx + PAGE_SIZE);
  const startItem = visibleEvents.length === 0 ? 0 : startIdx + 1;
  const endItem = Math.min(startIdx + PAGE_SIZE, visibleEvents.length);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [searchQuery, actionFilter, appFilter, facilityFilter, activeSort]);

  const toggleRow = (id: string | number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatTimestamp = (val: string) => {
    const dt = new Date(val);
    if (Number.isNaN(dt.getTime())) return "—";
    const d = formatDateOnlyInTimeZone(dt, null, "MMM d, yyyy");
    const t = formatTimeInTimeZone(dt, null, "h:mm a");
    return `${d} at ${t}`;
  };

  return (
    <div className="space-y-4">
      <AdminTableCard>
        <AdminListToolbar
          sortOptions={LOG_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
          actions={
            <Button
              variant="default"
              size="sm"
              onClick={() => void reload()}
              disabled={loading}
            >
              <RefreshCw
                className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(
                  " "
                )}
              />
              Refresh
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <label className="flex h-7 items-center gap-2 rounded-lg border border-cf-border bg-cf-surface px-2.5 text-xs text-cf-text-muted focus-within:border-cf-accent focus-within:ring-1 focus-within:ring-cf-accent/20">
              <Search className="h-3.5 w-3.5 text-cf-text-subtle" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-36 bg-transparent text-xs outline-none placeholder:text-cf-text-subtle"
                aria-label="Search logs"
              />
            </label>

            {/* Action Filter */}
            <div className="relative flex items-center">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setExpandedId(null);
                }}
                className="h-7 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none hover:bg-cf-surface-soft cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="export">Export</option>
                <option value="login">Login</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
            </div>

            {/* App Label Filter */}
            <div className="relative flex items-center">
              <select
                value={appFilter}
                onChange={(e) => {
                  setAppFilter(e.target.value);
                  setExpandedId(null);
                }}
                className="h-7 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none hover:bg-cf-surface-soft cursor-pointer"
              >
                <option value="all">All Apps</option>
                {scope === "organization" ? (
                  <>
                    <option value="organizations">Organization</option>
                    <option value="billing">Billing</option>
                    <option value="facilities">Facilities</option>
                  </>
                ) : (
                  <>
                    <option value="appointments">Appointments</option>
                    <option value="patients">Patients</option>
                    <option value="clinical">Clinical</option>
                    <option value="billing">Billing</option>
                    <option value="users">Users</option>
                    <option value="facilities">Facilities</option>
                  </>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
            </div>

            {showFacilityFilter ? (
              <div className="relative flex items-center">
                <select
                  value={facilityFilter}
                  onChange={(e) => {
                    setFacilityFilter(e.target.value);
                    setExpandedId(null);
                  }}
                  className="h-7 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none hover:bg-cf-surface-soft cursor-pointer"
                >
                  <option value="all">All Facilities</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
              </div>
            ) : null}
          </div>
        </AdminListToolbar>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                <th className="px-5 py-3 text-left w-24">Action</th>
                <th className="px-5 py-3 text-left">Summary</th>
                <th className="px-5 py-3 text-left">Actor</th>
                <th className="px-5 py-3 text-left">Facility</th>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Timestamp</th>
                <th className="px-5 py-3 text-center w-12">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading && events.length === 0 ? null : loadError ? (
                <AdminTableLoadError
                  colSpan={7}
                  message={`Couldn't load ${scopeLabel} activity log.`}
                  onRetry={() => void reload()}
                />
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No {scopeLabel} activity logs recorded.
                  </td>
                </tr>
              ) : visibleEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No logs match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const isExpanded = expandedId === event.id;
                  const badgeVariant =
                    ACTION_BADGES[event.action.toLowerCase()] || "neutral";

                  return (
                    <Fragment key={event.id}>
                      <tr className={isExpanded ? "bg-cf-accent/[0.03]" : ""}>
                        <td className="px-5 py-4 w-24 align-middle">
                          <Badge
                            variant={badgeVariant}
                            className="uppercase text-[9px] tracking-wider px-2 py-0.5"
                          >
                            {event.action}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 align-middle font-medium text-cf-text">
                          {event.summary}
                        </td>
                        <td className="px-5 py-4 align-middle text-cf-text-muted">
                          {event.actor_name || "System"}
                        </td>
                        <td className="px-5 py-4 align-middle text-cf-text-muted">
                          {event.facility_name || "—"}
                        </td>
                        <td className="px-5 py-4 align-middle text-cf-text-muted">
                          {event.patient_name || "—"}
                        </td>
                        <td className="px-5 py-4 align-middle text-cf-text-muted whitespace-nowrap">
                          {formatTimestamp(event.created_at)}
                        </td>
                        <td className="px-5 py-4 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(event.id)}
                            className="p-1.5 rounded-lg border border-cf-border hover:bg-cf-surface-soft text-cf-text-subtle hover:text-cf-text transition"
                            aria-label={
                              isExpanded ? "Hide metadata" : "View metadata"
                            }
                            title={
                              isExpanded ? "Hide metadata" : "View metadata"
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-cf-surface-soft/20">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-cf-text-subtle uppercase tracking-wider">
                                <FileJson className="h-3.5 w-3.5 text-cf-accent" />
                                Event Context Details
                              </div>
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-3 text-xs shadow-sm">
                                  <div className="font-semibold text-cf-text-muted uppercase text-[9px] tracking-wider mb-2 border-b border-cf-border/60 pb-1">
                                    System Spec
                                  </div>
                                  <div className="space-y-1.5 font-mono text-cf-text leading-relaxed">
                                    <div>
                                      <span className="text-cf-text-subtle">
                                        ID:
                                      </span>{" "}
                                      {event.id}
                                    </div>
                                    <div>
                                      <span className="text-cf-text-subtle">
                                        App:
                                      </span>{" "}
                                      {event.app_label}
                                    </div>
                                    <div>
                                      <span className="text-cf-text-subtle">
                                        Model:
                                      </span>{" "}
                                      {event.model_name || "—"}
                                    </div>
                                    <div>
                                      <span className="text-cf-text-subtle">
                                        PK:
                                      </span>{" "}
                                      {event.object_pk || "—"}
                                    </div>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-3 text-xs shadow-sm sm:col-span-2">
                                  <div className="font-semibold text-cf-text-muted uppercase text-[9px] tracking-wider mb-2 border-b border-cf-border/60 pb-1">
                                    Payload Metadata
                                  </div>
                                  <pre className="max-h-48 overflow-y-auto rounded-lg bg-cf-surface-soft/60 p-2.5 font-mono text-[11px] text-cf-text leading-relaxed border border-cf-border/40">
                                    {JSON.stringify(event.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-cf-border bg-cf-surface-soft/40 px-5 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-cf-text-muted">
          <div className="font-medium tabular-nums">
            {visibleEvents.length === 0
              ? `0 of ${events.length} activity records`
              : `Showing ${startItem}–${endItem} of ${visibleEvents.length} activity records`}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(safePage - 1);
                  setExpandedId(null);
                }}
                disabled={safePage <= 1}
                className={[
                  "inline-flex h-8 items-center gap-1 rounded-lg border border-cf-border bg-cf-surface px-2.5 font-semibold transition",
                  safePage > 1
                    ? "text-cf-text hover:border-cf-border-strong hover:bg-cf-surface-soft"
                    : "cursor-not-allowed text-cf-text-subtle opacity-50",
                ].join(" ")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              <span className="min-w-16 text-center font-semibold tabular-nums text-cf-text">
                {safePage} / {pageCount}
              </span>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(safePage + 1);
                  setExpandedId(null);
                }}
                disabled={safePage >= pageCount}
                className={[
                  "inline-flex h-8 items-center gap-1 rounded-lg border border-cf-border bg-cf-surface px-2.5 font-semibold transition",
                  safePage < pageCount
                    ? "text-cf-text hover:border-cf-border-strong hover:bg-cf-surface-soft"
                    : "cursor-not-allowed text-cf-text-subtle opacity-50",
                ].join(" ")}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </AdminTableCard>
    </div>
  );
}
