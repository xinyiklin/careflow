import {
  LineChart,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserX,
  Code2,
  MapPin,
  Clock,
  Coins,
  Users,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import type { ComponentType } from "react";

import { CategoryRail, CategoryRailItem } from "../../../shared/components/ui";
import {
  formatBillingCurrency,
  getRecordChargeAmount,
  type BillingIssueFilter,
  type BillingIssueOption,
  type BillingMixItem,
  type BillingQueueDefinition,
  type BillingQueueKey,
  type BillingWorkspaceItem,
  type BillingWorkspaceSummary,
} from "./billingWorkspaceUtils";

import type { ClinicalEncounter, EncounterBillingRecord } from "../types";

type HeaderMetricProps = {
  label: string;
  value: string | number;
  detail?: string;
};

function HeaderMetric({ label, value, detail }: HeaderMetricProps) {
  return (
    <div className="min-w-0 px-4 py-0.5 first:pl-0 last:pr-0 border-r last:border-r-0 border-cf-border/60">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-cf-text-subtle leading-none">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 min-w-0">
        <span className="truncate text-base font-extrabold tabular-nums text-cf-text leading-none tracking-tight">
          {value}
        </span>
        {detail ? (
          <span className="truncate text-[10px] font-semibold text-cf-text-muted/80 leading-none">
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function BillingWorkspaceHeader({
  summary,
}: {
  summary: BillingWorkspaceSummary;
}) {
  const openGaps =
    summary.missingPayerCount +
    summary.codingGapCount +
    summary.missingPosCount;

  return (
    <div className="mb-0 shrink-0 border-b border-cf-border bg-cf-surface px-5 py-2.5 transition-[background-color,border-color] duration-150">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cf-text-subtle leading-none">
            Billing Center
          </div>
          <div className="mt-1 text-base font-extrabold tracking-tight text-cf-text leading-none">
            Claims & Revenue
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-0">
          <HeaderMetric
            label="Unbilled"
            value={summary.pendingCount}
            detail={`${summary.codingCount} coding`}
          />
          <HeaderMetric
            label="Ready"
            value={summary.readyCount}
            detail={formatBillingCurrency(summary.readyCharges)}
          />
          <HeaderMetric
            label="Claimed"
            value={summary.claimCount}
            detail={formatBillingCurrency(summary.claimCharges)}
          />
          <HeaderMetric
            label="Open Gaps"
            value={openGaps}
            detail={`${summary.agedCount} aging`}
          />
        </div>
      </div>
    </div>
  );
}

function MixList({ title, items }: { title: string; items: BillingMixItem[] }) {
  if (!items.length) return null;

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="border-t border-cf-border pt-3.5">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div
              key={item.label}
              className="relative group flex min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-cf-surface/50"
            >
              <div
                className="absolute inset-y-0 left-0 bg-cf-accent/5 rounded-r transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 truncate text-cf-text-muted font-medium">
                {item.label}
              </span>
              <span className="relative z-10 shrink-0 font-semibold tabular-nums text-cf-text">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const issueIcons = {
  all: Layers,
  missing_payer: UserX,
  missing_coding: Code2,
  missing_pos: MapPin,
  aged: Clock,
};

export function BillingQueueRail({
  queues,
  activeQueue,
  onQueueChange,
  issueOptions,
  activeIssueFilter,
  onIssueFilterChange,
  providerLoad,
}: {
  queues: BillingQueueDefinition[];
  activeQueue: BillingQueueKey;
  onQueueChange: (queue: BillingQueueKey) => void;
  issueOptions: BillingIssueOption[];
  activeIssueFilter: BillingIssueFilter;
  onIssueFilterChange: (issue: BillingIssueFilter) => void;
  providerLoad: BillingMixItem[];
}) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-4 border-b border-cf-border bg-cf-surface-muted/70 p-3 md:border-b-0 md:border-r md:overflow-y-auto">
      <div className="min-w-0">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle font-bold">
          Workflow queues
        </p>
        <CategoryRail
          label="Billing queues"
          className="flex min-w-0 gap-1 overflow-x-auto md:min-h-0 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain"
        >
          {queues.map((queue) => {
            const isActive = activeQueue === queue.id;
            return (
              <CategoryRailItem
                key={queue.id}
                onClick={() => onQueueChange(queue.id)}
                active={isActive}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="truncate">{queue.label}</span>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                      isActive
                        ? "bg-cf-page-bg text-cf-accent"
                        : "border border-cf-border bg-cf-surface-soft text-cf-text-subtle",
                    ].join(" ")}
                  >
                    {queue.count}
                  </span>
                </span>
              </CategoryRailItem>
            );
          })}
        </CategoryRail>
      </div>

      <div className="border-t border-cf-border pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle font-bold">
          Attention
        </p>
        <div className="grid gap-1">
          {issueOptions.map((option) => {
            const isActive = activeIssueFilter === option.id;
            const isDisabled = option.id !== "all" && option.count === 0;
            const Icon = issueIcons[option.id] || Layers;
            return (
              <button
                key={option.id}
                type="button"
                disabled={isDisabled}
                aria-pressed={isActive}
                onClick={() => onIssueFilterChange(option.id)}
                className={[
                  "flex min-h-8 items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25",
                  isActive
                    ? "bg-cf-surface font-semibold text-cf-text shadow-[var(--shadow-panel)]"
                    : "text-cf-text-muted hover:bg-cf-surface/70 hover:text-cf-text",
                  isDisabled ? "cursor-not-allowed opacity-45" : "",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={[
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      isActive ? "text-cf-accent" : "text-cf-text-subtle",
                    ].join(" ")}
                  />
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-cf-text-subtle font-medium">
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden min-h-0 space-y-3 md:block">
        <MixList title="Provider load" items={providerLoad} />
      </div>
    </aside>
  );
}

export function BillingQueuePagination({
  currentPage,
  pageCount,
  totalCount,
  startItem,
  endItem,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  totalCount: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <div className="flex flex-col gap-2 border-t border-cf-border/70 pt-3 text-xs text-cf-text-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="font-medium tabular-nums">
        Showing {startItem}-{endItem} of {totalCount}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={[
            "inline-flex h-8 items-center gap-1 rounded-lg border border-cf-border bg-cf-surface px-2.5 font-semibold transition",
            canGoPrevious
              ? "text-cf-text hover:border-cf-border-strong hover:bg-cf-surface-soft"
              : "cursor-not-allowed text-cf-text-subtle opacity-50",
          ].join(" ")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        <span className="min-w-16 text-center font-semibold tabular-nums text-cf-text">
          {currentPage} / {pageCount}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={[
            "inline-flex h-8 items-center gap-1 rounded-lg border border-cf-border bg-cf-surface px-2.5 font-semibold transition",
            canGoNext
              ? "text-cf-text hover:border-cf-border-strong hover:bg-cf-surface-soft"
              : "cursor-not-allowed text-cf-text-subtle opacity-50",
          ].join(" ")}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function insightCount(options: BillingIssueOption[], id: BillingIssueFilter) {
  return options.find((option) => option.id === id)?.count || 0;
}

function InsightMetric({
  label,
  value,
  icon: Icon,
}: HeaderMetricProps & { icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 px-2 py-0.5">
      {Icon ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cf-surface-soft text-cf-text-subtle">
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-cf-text-subtle leading-none">
          {label}
        </div>
        <div className="mt-1 truncate text-xs font-bold tabular-nums text-cf-text leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}

export function BillingQueueInsightStrip({
  activeQueue,
  items,
  issueOptions,
}: {
  activeQueue: BillingQueueKey;
  items: BillingWorkspaceItem[];
  issueOptions: BillingIssueOption[];
}) {
  const recordItems =
    activeQueue === "pending_coding" ? [] : (items as EncounterBillingRecord[]);
  const providerCount = new Set(
    items
      .map((item) =>
        activeQueue === "pending_coding"
          ? (item as ClinicalEncounter).rendering_provider_name
          : (item as EncounterBillingRecord).rendering_provider_name
      )
      .filter(Boolean)
  ).size;
  const queueValue = recordItems.reduce(
    (sum, record) => sum + getRecordChargeAmount(record),
    0
  );

  return (
    <div className="mb-3 grid gap-3 rounded-xl border border-cf-border bg-cf-surface/60 px-4 py-2 md:grid-cols-[auto_repeat(4,minmax(0,1fr))] md:items-center">
      <div className="flex items-center gap-2 text-cf-text-subtle">
        <LineChart className="h-4 w-4" />
      </div>
      {activeQueue === "pending_coding" ? (
        <>
          <InsightMetric
            label="Encounters"
            value={items.length}
            icon={ClipboardList}
          />
          <InsightMetric label="Providers" value={providerCount} icon={Users} />
          <InsightMetric
            label="Aging 7d"
            value={insightCount(issueOptions, "aged")}
            icon={Clock}
          />
          <InsightMetric
            label="Next Step"
            value="Create superbill"
            icon={CheckSquare}
          />
        </>
      ) : (
        <>
          <InsightMetric
            label="Queue Value"
            value={formatBillingCurrency(queueValue)}
            icon={Coins}
          />
          <InsightMetric
            label="Missing Payer"
            value={insightCount(issueOptions, "missing_payer")}
            icon={UserX}
          />
          <InsightMetric
            label="Coding Gaps"
            value={insightCount(issueOptions, "missing_coding")}
            icon={Code2}
          />
          <InsightMetric
            label="Aging 7d"
            value={insightCount(issueOptions, "aged")}
            icon={Clock}
          />
        </>
      )}
    </div>
  );
}
