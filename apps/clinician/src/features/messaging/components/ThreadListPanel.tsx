import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import { Badge, Button, SegmentedControl } from "../../../shared/components/ui";
import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import {
  useMessageThreads,
  type MessageThreadStatus,
  type MessageThreadSummary,
} from "../api/messaging";

import type { EntityId } from "../../../shared/api/types";

type StatusFilter = "all" | "open" | "closed";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
  { value: "closed", label: "Closed" },
];

type ThreadListPanelProps = {
  facilityId: EntityId | null;
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
};

function formatRelative(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 1) return "now";
  if (Math.abs(diffMinutes) < 60) {
    return `${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${diffHours}h`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return `${diffDays}d`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ThreadRow({
  thread,
  isActive,
  onSelect,
}: {
  thread: MessageThreadSummary;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={`flex w-full items-start gap-2.5 border-b border-cf-border px-4 py-3 text-left transition-colors last:border-b-0 ${
          isActive
            ? "bg-cf-surface-soft"
            : "bg-cf-surface hover:bg-cf-surface-soft/60"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            thread.unread_for_clinician ? "bg-cf-accent" : "bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-sm ${
                thread.unread_for_clinician
                  ? "font-semibold text-cf-text"
                  : "font-medium text-cf-text"
              }`}
            >
              {thread.patient_display_name}
            </span>
            <span className="shrink-0 text-[11px] text-cf-text-subtle">
              {formatRelative(thread.last_message_at)}
            </span>
          </div>
          <p
            className={`mt-0.5 truncate text-xs ${
              thread.unread_for_clinician
                ? "font-medium text-cf-text"
                : "text-cf-text-muted"
            }`}
          >
            {thread.subject || "(no subject)"}
          </p>
          {thread.status === "closed" ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-cf-surface-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cf-text-subtle">
              Closed
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export default function ThreadListPanel({
  facilityId,
  activeThreadId,
  onSelectThread,
}: ThreadListPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 250);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const status: MessageThreadStatus | "" =
    statusFilter === "all" ? "" : statusFilter;

  const { data, isLoading, isError, isFetching, refetch } = useMessageThreads({
    facilityId,
    status,
    search: debouncedSearch || undefined,
  });
  const showThreadsLoading = useMinimumLoading(isLoading);

  const threads = useMemo(() => data ?? [], [data]);

  const unreadCount = useMemo(
    () => threads.filter((thread) => thread.unread_for_clinician).length,
    [threads]
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-cf-border bg-cf-surface md:border-r">
      <div className="border-b border-cf-border bg-cf-surface px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-cf-text">Inbox</h2>
            {unreadCount > 0 ? (
              <Badge variant="warning" size="sm">
                {unreadCount} new
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh threads"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
        <div className="mt-3 space-y-2.5">
          <SegmentedControl
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            size="xs"
            variant="pill"
          />
          <label htmlFor="messaging-thread-search" className="sr-only">
            Search threads
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-cf-text-subtle"
              aria-hidden="true"
            />
            <input
              id="messaging-thread-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by patient or subject"
              className="h-8 w-full rounded-lg border border-cf-border bg-cf-surface pl-7 pr-2.5 text-xs text-cf-text outline-none transition placeholder:text-cf-text-subtle focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/15"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showThreadsLoading ? (
          <p className="px-4 py-6 text-sm text-cf-text-muted">Loading…</p>
        ) : isLoading ? null : isError ? (
          <div className="px-4 py-6 text-sm text-cf-text-muted">
            <p>Could not load conversations.</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : threads.length === 0 ? (
          <p className="px-4 py-6 text-sm text-cf-text-muted">
            {debouncedSearch
              ? "No conversations match this search."
              : statusFilter === "closed"
                ? "No closed conversations."
                : statusFilter === "open"
                  ? "No open conversations."
                  : "No conversations yet."}
          </p>
        ) : (
          <ul>
            {threads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={() => onSelectThread(thread.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
