import { ArrowUpDown, Search, ChevronDown } from "lucide-react";

import {
  ALL_PAYERS_FILTER,
  SORT_OPTIONS,
  type BillingPayerOption,
  type BillingQueueKey,
  type BillingSortMode,
} from "./billingWorkspaceUtils";

export default function BillingQueueToolbar({
  activeQueue,
  searchTerm,
  payerFilter,
  payerOptions,
  sortMode,
  startDate,
  endDate,
  signingFilter,
  onSearchTermChange,
  onPayerFilterChange,
  onSortModeChange,
  onStartDateChange,
  onEndDateChange,
  onSigningFilterChange,
}: {
  activeQueue: BillingQueueKey;
  searchTerm: string;
  payerFilter: string;
  payerOptions: BillingPayerOption[];
  sortMode: BillingSortMode;
  startDate: string;
  endDate: string;
  signingFilter: "all" | "signed" | "unsigned";
  onSearchTermChange: (value: string) => void;
  onPayerFilterChange: (value: string) => void;
  onSortModeChange: (value: BillingSortMode) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSigningFilterChange: (value: "all" | "signed" | "unsigned") => void;
}) {
  const sortOptions = SORT_OPTIONS.filter((option) => {
    if (activeQueue === "pending_coding") {
      return (
        option.id === "newest" ||
        option.id === "oldest" ||
        option.id === "patient-name"
      );
    }
    return true;
  });
  const isPayerFilterDisabled = payerOptions.length === 0;

  return (
    <div className="shrink-0 border-b border-cf-border bg-cf-surface px-5 py-2.5 transition-[background-color,border-color] duration-150">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-grow max-w-sm">
          <span className="sr-only">Search items</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cf-text-subtle" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder={
              activeQueue === "pending_coding"
                ? "Search patient, provider, reason..."
                : "Search patient, code, provider, payer..."
            }
            className="h-8 w-full rounded-lg border border-cf-border bg-cf-surface py-1 pr-3 pl-9 text-xs text-cf-text outline-none transition placeholder:text-cf-text-subtle focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10"
          />
        </div>

        {/* Right Side: Filters, Date Range and Sort Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5 border-r border-cf-border/60 pr-2 mr-1">
            <span className="text-[10px] font-bold text-cf-text-subtle uppercase tracking-wider">
              Dates
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="h-8 max-w-[7.5rem] rounded-lg border border-cf-border bg-cf-surface px-2 text-[11px] font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
              <span className="text-xs text-cf-text-subtle">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="h-8 max-w-[7.5rem] rounded-lg border border-cf-border bg-cf-surface px-2 text-[11px] font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Signing Status Filter (Only for Pending Coding queue) */}
          {activeQueue === "pending_coding" && (
            <div className="relative flex items-center">
              <label className="sr-only" htmlFor="signing-filter">
                Filter by signing status
              </label>
              <select
                id="signing-filter"
                value={signingFilter}
                onChange={(event) =>
                  onSigningFilterChange(
                    event.target.value as "all" | "signed" | "unsigned"
                  )
                }
                className="h-8 min-w-[8.5rem] appearance-none rounded-lg border border-cf-border bg-cf-surface pr-8 pl-3 text-xs font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="unsigned">In Progress</option>
                <option value="signed">Signed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-cf-text-subtle/80" />
            </div>
          )}

          {/* Payer filter */}
          <div className="relative flex items-center">
            <label className="sr-only" htmlFor="payer-filter">
              Filter by payer or insurance
            </label>
            <select
              id="payer-filter"
              value={payerFilter}
              disabled={isPayerFilterDisabled}
              onChange={(event) => onPayerFilterChange(event.target.value)}
              className="h-8 min-w-[9.5rem] appearance-none rounded-lg border border-cf-border bg-cf-surface pr-8 pl-3 text-xs font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <option value={ALL_PAYERS_FILTER}>All payers</option>
              {payerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-cf-text-subtle/80" />
          </div>

          {/* Sorting */}
          <div className="relative flex items-center">
            <label className="sr-only" htmlFor="queue-sort">
              Sort items
            </label>
            <div className="relative flex items-center w-full">
              <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-cf-text-subtle" />
              <select
                id="queue-sort"
                value={sortMode}
                onChange={(event) =>
                  onSortModeChange(event.target.value as BillingSortMode)
                }
                className="h-8 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-8 pl-9 text-xs font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-cf-text-subtle/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
