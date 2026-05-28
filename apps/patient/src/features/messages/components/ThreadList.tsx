import { Plus } from "lucide-react";

import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { formatRelative } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useMessageThreads,
  type PortalMessageThreadSummary,
} from "../api/messaging";

type ThreadListProps = {
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
  onStartNew: () => void;
};

function ThreadRow({
  thread,
  isActive,
  onSelect,
}: {
  thread: PortalMessageThreadSummary;
  isActive: boolean;
  onSelect: () => void;
}) {
  const preview = thread.last_message_preview?.trim() || "No messages yet.";
  const relative = formatRelative(thread.last_message_at);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={`flex w-full items-start gap-2 border-b border-cf-border px-3 py-3 text-left transition-colors last:border-b-0 ${
          isActive
            ? "bg-cf-accent-soft"
            : "bg-cf-surface hover:bg-cf-surface-soft"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            thread.unread_for_patient ? "bg-cf-accent" : "bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-sm ${
                thread.unread_for_patient
                  ? "font-semibold text-cf-text"
                  : "font-medium text-cf-text"
              }`}
            >
              {thread.subject || "(no subject)"}
            </span>
            <span className="shrink-0 text-[10px] text-cf-text-subtle">
              {relative}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-cf-text-muted">
            {preview}
          </p>
          {thread.status === "closed" ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-cf-surface-soft px-2 py-0.5 text-[10px] font-medium text-cf-text-muted">
              Closed
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function ThreadList({
  activeThreadId,
  onSelectThread,
  onStartNew,
}: ThreadListProps) {
  const { data, isError, error, isLoading } = useMessageThreads();
  const threads = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-cf-border px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
          Conversations
        </h2>
        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center gap-1 rounded-cf-control border border-cf-border bg-cf-surface px-2 py-1 text-[11px] font-semibold text-cf-text transition hover:bg-cf-surface-soft"
        >
          <Plus size={12} aria-hidden="true" />
          <span>New</span>
        </button>
      </div>

      {isError ? (
        <p className="px-3 py-3 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      ) : isLoading ? (
        <p className="px-3 py-3 text-sm text-cf-text-muted">Loading…</p>
      ) : threads.length === 0 ? (
        <EmptyState message="No messages yet. Start a conversation with your care team." />
      ) : (
        <ul className="flex-1 overflow-y-auto">
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
  );
}
